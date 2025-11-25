package main

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for development
	},
}

// Hub manages WebSocket connections and message routing
type Hub struct {
	// Registered clients by user ID
	clients map[string]map[*Client]bool

	// Conversation rooms: conversation_id -> clients
	rooms map[string]map[*Client]bool

	// Presence tracking: user_id -> presence status
	presence map[string]string

	// Typing indicators: conversation_id -> user_ids
	typing map[string]map[string]time.Time

	// Channels
	register   chan *Client
	unregister chan *Client
	broadcast  chan *BroadcastMessage

	mu sync.RWMutex
}

// Client represents a single WebSocket connection
type Client struct {
	hub            *Hub
	conn           *websocket.Conn
	send           chan []byte
	userID         string
	dealershipID   string
	conversations  map[string]bool // Subscribed conversation IDs
	mu             sync.RWMutex
}

// BroadcastMessage represents a message to broadcast
type BroadcastMessage struct {
	ConversationID string
	UserID         string // Target specific user (empty for all in conversation)
	Message        []byte
	ExcludeUserID  string // Exclude this user from broadcast
}

// NewHub creates a new Hub
func NewHub() *Hub {
	return &Hub{
		clients:    make(map[string]map[*Client]bool),
		rooms:      make(map[string]map[*Client]bool),
		presence:   make(map[string]string),
		typing:     make(map[string]map[string]time.Time),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		broadcast:  make(chan *BroadcastMessage, 256),
	}
}

// Run starts the hub's event loop
func (h *Hub) Run() {
	// Typing cleanup ticker
	typingCleanup := time.NewTicker(5 * time.Second)
	defer typingCleanup.Stop()

	for {
		select {
		case client := <-h.register:
			h.registerClient(client)

		case client := <-h.unregister:
			h.unregisterClient(client)

		case msg := <-h.broadcast:
			h.broadcastMessage(msg)

		case <-typingCleanup.C:
			h.cleanupTypingIndicators()
		}
	}
}

func (h *Hub) registerClient(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	// Add to user's client set
	if h.clients[client.userID] == nil {
		h.clients[client.userID] = make(map[*Client]bool)
	}
	h.clients[client.userID][client] = true

	// Update presence
	h.presence[client.userID] = "ONLINE"

	log.Printf("Client registered: user=%s, dealership=%s", client.userID, client.dealershipID)
}

func (h *Hub) unregisterClient(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	// Remove from user's client set
	if clients, ok := h.clients[client.userID]; ok {
		delete(clients, client)
		if len(clients) == 0 {
			delete(h.clients, client.userID)
			h.presence[client.userID] = "OFFLINE"
		}
	}

	// Remove from all conversation rooms
	client.mu.RLock()
	for convID := range client.conversations {
		if room, ok := h.rooms[convID]; ok {
			delete(room, client)
		}
	}
	client.mu.RUnlock()

	close(client.send)
	log.Printf("Client unregistered: user=%s", client.userID)
}

func (h *Hub) broadcastMessage(msg *BroadcastMessage) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	// If targeting specific user
	if msg.UserID != "" {
		if clients, ok := h.clients[msg.UserID]; ok {
			for client := range clients {
				select {
				case client.send <- msg.Message:
				default:
					// Buffer full, client will be cleaned up
				}
			}
		}
		return
	}

	// Broadcast to conversation room
	if room, ok := h.rooms[msg.ConversationID]; ok {
		for client := range room {
			if client.userID == msg.ExcludeUserID {
				continue
			}
			select {
			case client.send <- msg.Message:
			default:
				// Buffer full
			}
		}
	}
}

func (h *Hub) cleanupTypingIndicators() {
	h.mu.Lock()
	defer h.mu.Unlock()

	now := time.Now()
	for convID, users := range h.typing {
		for userID, timestamp := range users {
			if now.Sub(timestamp) > 5*time.Second {
				delete(users, userID)
				// Broadcast typing stop
				h.broadcastTypingStop(convID, userID)
			}
		}
		if len(users) == 0 {
			delete(h.typing, convID)
		}
	}
}

func (h *Hub) broadcastTypingStop(conversationID, userID string) {
	msg := WSMessage{
		Type:           WSEventTypingStop,
		ConversationID: &conversationID,
		Timestamp:      time.Now(),
	}
	data, _ := json.Marshal(map[string]interface{}{
		"user_id": userID,
	})
	msg.Data = data

	jsonData, _ := json.Marshal(msg)
	h.broadcast <- &BroadcastMessage{
		ConversationID: conversationID,
		Message:        jsonData,
		ExcludeUserID:  userID,
	}
}

// SubscribeToConversation adds client to a conversation room
func (h *Hub) SubscribeToConversation(client *Client, conversationID string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if h.rooms[conversationID] == nil {
		h.rooms[conversationID] = make(map[*Client]bool)
	}
	h.rooms[conversationID][client] = true

	client.mu.Lock()
	client.conversations[conversationID] = true
	client.mu.Unlock()

	log.Printf("Client subscribed to conversation: user=%s, conversation=%s", client.userID, conversationID)
}

// UnsubscribeFromConversation removes client from a conversation room
func (h *Hub) UnsubscribeFromConversation(client *Client, conversationID string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if room, ok := h.rooms[conversationID]; ok {
		delete(room, client)
	}

	client.mu.Lock()
	delete(client.conversations, conversationID)
	client.mu.Unlock()
}

// SetTyping sets typing indicator for a user in a conversation
func (h *Hub) SetTyping(conversationID, userID, userName string, isTyping bool) {
	h.mu.Lock()

	if isTyping {
		if h.typing[conversationID] == nil {
			h.typing[conversationID] = make(map[string]time.Time)
		}
		h.typing[conversationID][userID] = time.Now()
	} else {
		if users, ok := h.typing[conversationID]; ok {
			delete(users, userID)
		}
	}

	h.mu.Unlock()

	// Broadcast typing event
	eventType := WSEventTypingStart
	if !isTyping {
		eventType = WSEventTypingStop
	}

	msg := WSMessage{
		Type:           eventType,
		ConversationID: &conversationID,
		Timestamp:      time.Now(),
	}
	data, _ := json.Marshal(TypingIndicator{
		ConversationID: conversationID,
		UserID:         userID,
		UserName:       userName,
		IsTyping:       isTyping,
		Timestamp:      time.Now(),
	})
	msg.Data = data

	jsonData, _ := json.Marshal(msg)
	h.broadcast <- &BroadcastMessage{
		ConversationID: conversationID,
		Message:        jsonData,
		ExcludeUserID:  userID,
	}
}

// BroadcastToConversation sends a message to all clients in a conversation
func (h *Hub) BroadcastToConversation(conversationID string, eventType string, data interface{}, excludeUserID string) {
	msg := WSMessage{
		Type:           eventType,
		ConversationID: &conversationID,
		Timestamp:      time.Now(),
	}
	if data != nil {
		jsonData, _ := json.Marshal(data)
		msg.Data = jsonData
	}

	msgBytes, _ := json.Marshal(msg)
	h.broadcast <- &BroadcastMessage{
		ConversationID: conversationID,
		Message:        msgBytes,
		ExcludeUserID:  excludeUserID,
	}
}

// BroadcastToUser sends a message to a specific user
func (h *Hub) BroadcastToUser(userID string, eventType string, data interface{}) {
	msg := WSMessage{
		Type:      eventType,
		Timestamp: time.Now(),
	}
	if data != nil {
		jsonData, _ := json.Marshal(data)
		msg.Data = jsonData
	}

	msgBytes, _ := json.Marshal(msg)
	h.broadcast <- &BroadcastMessage{
		UserID:  userID,
		Message: msgBytes,
	}
}

// GetUserPresence returns the presence status of a user
func (h *Hub) GetUserPresence(userID string) string {
	h.mu.RLock()
	defer h.mu.RUnlock()

	if presence, ok := h.presence[userID]; ok {
		return presence
	}
	return "OFFLINE"
}

// GetTypingUsers returns users currently typing in a conversation
func (h *Hub) GetTypingUsers(conversationID string) []string {
	h.mu.RLock()
	defer h.mu.RUnlock()

	var users []string
	if typing, ok := h.typing[conversationID]; ok {
		for userID := range typing {
			users = append(users, userID)
		}
	}
	return users
}

// Client methods

func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(512 * 1024) // 512KB max message size
	c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		c.handleMessage(message)
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Batch pending messages
			n := len(c.send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (c *Client) handleMessage(message []byte) {
	var msg struct {
		Type           string `json:"type"`
		ConversationID string `json:"conversation_id,omitempty"`
		IsTyping       bool   `json:"is_typing,omitempty"`
	}

	if err := json.Unmarshal(message, &msg); err != nil {
		log.Printf("Error parsing message: %v", err)
		return
	}

	switch msg.Type {
	case "SUBSCRIBE_CONVERSATION":
		if msg.ConversationID != "" {
			c.hub.SubscribeToConversation(c, msg.ConversationID)
		}

	case "UNSUBSCRIBE_CONVERSATION":
		if msg.ConversationID != "" {
			c.hub.UnsubscribeFromConversation(c, msg.ConversationID)
		}

	case "TYPING":
		if msg.ConversationID != "" {
			// Get user name (would normally come from DB or context)
			c.hub.SetTyping(msg.ConversationID, c.userID, "User", msg.IsTyping)
		}

	case "PING":
		// Respond with pong
		response := map[string]string{"type": "PONG", "timestamp": time.Now().Format(time.RFC3339)}
		data, _ := json.Marshal(response)
		c.send <- data
	}
}

// ServeWs handles WebSocket connection requests
func ServeWs(hub *Hub, w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	dealershipID := r.Header.Get("X-Dealership-ID")

	if userID == "" {
		http.Error(w, "Missing user ID", http.StatusBadRequest)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}

	client := &Client{
		hub:           hub,
		conn:          conn,
		send:          make(chan []byte, 256),
		userID:        userID,
		dealershipID:  dealershipID,
		conversations: make(map[string]bool),
	}

	hub.register <- client

	go client.writePump()
	go client.readPump()
}
