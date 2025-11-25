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
		return true // Allow all origins in development
	},
}

// Client represents a single WebSocket connection
type Client struct {
	hub          *Hub
	conn         *websocket.Conn
	send         chan []byte
	dealershipID string
}

// Hub maintains the set of active clients and broadcasts messages
type Hub struct {
	clients    map[*Client]bool
	rooms      map[string]map[*Client]bool // dealership_id -> clients
	broadcast  chan *BroadcastMessage
	register   chan *Client
	unregister chan *Client
	mu         sync.RWMutex
}

// BroadcastMessage is a message to be broadcast to clients
type BroadcastMessage struct {
	DealershipID string
	Message      []byte
}

// WSMessage is the structure of WebSocket messages
type WSMessage struct {
	Type string      `json:"type"`
	Data interface{} `json:"data,omitempty"`
}

// SubscribeMessage is sent by clients to subscribe to a dealership
type SubscribeMessage struct {
	Type         string `json:"type"`
	DealershipID string `json:"dealership_id"`
}

// NewHub creates a new Hub instance
func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		rooms:      make(map[string]map[*Client]bool),
		broadcast:  make(chan *BroadcastMessage, 256),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

// Run starts the hub's main loop
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			log.Printf("Client connected. Total clients: %d", len(h.clients))

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)

				// Remove from room
				if client.dealershipID != "" {
					if room, ok := h.rooms[client.dealershipID]; ok {
						delete(room, client)
						if len(room) == 0 {
							delete(h.rooms, client.dealershipID)
						}
					}
				}
			}
			h.mu.Unlock()
			log.Printf("Client disconnected. Total clients: %d", len(h.clients))

		case msg := <-h.broadcast:
			h.mu.RLock()
			if room, ok := h.rooms[msg.DealershipID]; ok {
				for client := range room {
					select {
					case client.send <- msg.Message:
					default:
						close(client.send)
						delete(h.clients, client)
						delete(room, client)
					}
				}
			}
			h.mu.RUnlock()
		}
	}
}

// Broadcast sends a message to all clients in a dealership room
func (h *Hub) Broadcast(dealershipID string, messageType string, data interface{}) {
	msg := WSMessage{
		Type: messageType,
		Data: data,
	}

	jsonData, err := json.Marshal(msg)
	if err != nil {
		log.Printf("Error marshaling WebSocket message: %v", err)
		return
	}

	h.broadcast <- &BroadcastMessage{
		DealershipID: dealershipID,
		Message:      jsonData,
	}
}

// readPump pumps messages from the WebSocket connection to the hub
func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(512)
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

		// Parse message
		var subMsg SubscribeMessage
		if err := json.Unmarshal(message, &subMsg); err != nil {
			log.Printf("Error parsing WebSocket message: %v", err)
			continue
		}

		// Handle subscription
		if subMsg.Type == "SUBSCRIBE" && subMsg.DealershipID != "" {
			c.hub.mu.Lock()

			// Remove from old room if any
			if c.dealershipID != "" {
				if room, ok := c.hub.rooms[c.dealershipID]; ok {
					delete(room, c)
					if len(room) == 0 {
						delete(c.hub.rooms, c.dealershipID)
					}
				}
			}

			// Add to new room
			c.dealershipID = subMsg.DealershipID
			if _, ok := c.hub.rooms[c.dealershipID]; !ok {
				c.hub.rooms[c.dealershipID] = make(map[*Client]bool)
			}
			c.hub.rooms[c.dealershipID][c] = true

			c.hub.mu.Unlock()

			log.Printf("Client subscribed to dealership: %s", c.dealershipID)

			// Send confirmation
			confirmMsg := WSMessage{
				Type: "SUBSCRIBED",
				Data: map[string]string{"dealership_id": c.dealershipID},
			}
			jsonData, _ := json.Marshal(confirmMsg)
			c.send <- jsonData
		}
	}
}

// writePump pumps messages from the hub to the WebSocket connection
func (c *Client) writePump() {
	ticker := time.NewTicker(54 * time.Second)
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

			// Add queued messages to the current WebSocket message
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

// ServeWS handles WebSocket requests from clients
func ServeWS(hub *Hub, w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}

	client := &Client{
		hub:  hub,
		conn: conn,
		send: make(chan []byte, 256),
	}

	client.hub.register <- client

	// Start pumps in goroutines
	go client.writePump()
	go client.readPump()
}

// WebSocket event types
const (
	WSEventVisitCreated  = "VISIT_CREATED"
	WSEventVisitUpdated  = "VISIT_UPDATED"
	WSEventStatusChanged = "STATUS_CHANGED"
	WSEventTimerStarted  = "TIMER_STARTED"
	WSEventTimerStopped  = "TIMER_STOPPED"
	WSEventNoteAdded     = "NOTE_ADDED"
	WSEventNoteUpdated   = "NOTE_UPDATED"
	WSEventNoteDeleted   = "NOTE_DELETED"
	WSEventVisitClosed   = "VISIT_CLOSED"
)
