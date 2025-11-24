package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/google/uuid"
)

const baseURL = "http://localhost:8080"

type User struct {
	ID           uuid.UUID  `json:"id"`
	DealershipID uuid.UUID  `json:"dealership_id"`
	Email        string     `json:"email"`
	Name         string     `json:"name"`
	Role         string     `json:"role"`
	Status       string     `json:"status"`
	Phone        *string    `json:"phone,omitempty"`
	AvatarURL    *string    `json:"avatar_url,omitempty"`
}

type CreateUserRequest struct {
	DealershipID uuid.UUID `json:"dealership_id"`
	Email        string    `json:"email"`
	Name         string    `json:"name"`
	Password     string    `json:"password"`
	Role         string    `json:"role"`
	Phone        *string   `json:"phone,omitempty"`
}

func main() {
	dealershipID := uuid.New()
	fmt.Printf("Using dealership ID: %s\n\n", dealershipID)

	// 1. Create an admin user
	fmt.Println("1. Creating admin user...")
	admin := CreateUserRequest{
		DealershipID: dealershipID,
		Email:        "admin@dealership.com",
		Name:         "John Admin",
		Password:     "secure_admin_password",
		Role:         "admin",
	}

	adminUser, err := createUser(admin)
	if err != nil {
		fmt.Printf("Error creating admin: %v\n", err)
		return
	}
	fmt.Printf("Created admin: %s (%s)\n\n", adminUser.Name, adminUser.Email)

	// 2. Create a manager user
	fmt.Println("2. Creating manager user...")
	phone := "+1-555-0123"
	manager := CreateUserRequest{
		DealershipID: dealershipID,
		Email:        "manager@dealership.com",
		Name:         "Jane Manager",
		Password:     "secure_manager_password",
		Role:         "manager",
		Phone:        &phone,
	}

	managerUser, err := createUser(manager)
	if err != nil {
		fmt.Printf("Error creating manager: %v\n", err)
		return
	}
	fmt.Printf("Created manager: %s (%s)\n\n", managerUser.Name, managerUser.Email)

	// 3. Create a salesperson
	fmt.Println("3. Creating salesperson...")
	salesperson := CreateUserRequest{
		DealershipID: dealershipID,
		Email:        "sales@dealership.com",
		Name:         "Bob Salesperson",
		Password:     "secure_sales_password",
		Role:         "salesperson",
	}

	salesUser, err := createUser(salesperson)
	if err != nil {
		fmt.Printf("Error creating salesperson: %v\n", err)
		return
	}
	fmt.Printf("Created salesperson: %s (%s)\n\n", salesUser.Name, salesUser.Email)

	// 4. List all users
	fmt.Println("4. Listing all users...")
	users, err := listUsers(dealershipID, nil, nil)
	if err != nil {
		fmt.Printf("Error listing users: %v\n", err)
		return
	}
	fmt.Printf("Total users: %d\n", len(users))
	for _, u := range users {
		fmt.Printf("  - %s (%s) - Role: %s\n", u.Name, u.Email, u.Role)
	}
	fmt.Println()

	// 5. Update user
	fmt.Println("5. Updating salesperson...")
	updateReq := map[string]string{
		"name": "Robert Salesperson",
	}
	updatedUser, err := updateUser(salesUser.ID, dealershipID, updateReq)
	if err != nil {
		fmt.Printf("Error updating user: %v\n", err)
		return
	}
	fmt.Printf("Updated user: %s\n\n", updatedUser.Name)

	// 6. Update role
	fmt.Println("6. Promoting salesperson to manager...")
	err = updateRole(salesUser.ID, dealershipID, "manager")
	if err != nil {
		fmt.Printf("Error updating role: %v\n", err)
		return
	}
	fmt.Println("Role updated successfully\n")

	// 7. Save preferences
	fmt.Println("7. Saving user preferences...")
	prefs := map[string]interface{}{
		"user_id":               adminUser.ID,
		"theme":                 "dark",
		"language":              "en",
		"notifications_enabled": true,
		"preferences_json": map[string]interface{}{
			"dashboard_layout": "compact",
			"show_notifications": true,
		},
	}
	err = savePreferences(adminUser.ID, prefs)
	if err != nil {
		fmt.Printf("Error saving preferences: %v\n", err)
		return
	}
	fmt.Println("Preferences saved successfully\n")

	// 8. Get activity
	fmt.Println("8. Getting user activity...")
	activities, err := getActivity(adminUser.ID, 10)
	if err != nil {
		fmt.Printf("Error getting activity: %v\n", err)
		return
	}
	fmt.Printf("User activities: %d entries\n\n", len(activities))

	// 9. Validate email
	fmt.Println("9. Validating email...")
	exists, err := validateEmail("admin@dealership.com", dealershipID)
	if err != nil {
		fmt.Printf("Error validating email: %v\n", err)
		return
	}
	fmt.Printf("Email exists: %v\n\n", exists)

	// 10. Deactivate user
	fmt.Println("10. Deactivating user...")
	err = deleteUser(salesUser.ID, dealershipID)
	if err != nil {
		fmt.Printf("Error deactivating user: %v\n", err)
		return
	}
	fmt.Println("User deactivated successfully")

	fmt.Println("\nAll operations completed successfully!")
}

func createUser(req CreateUserRequest) (*User, error) {
	body, _ := json.Marshal(req)
	resp, err := http.Post(baseURL+"/users", "application/json", bytes.NewBuffer(body))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("unexpected status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	var user User
	if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
		return nil, err
	}

	return &user, nil
}

func listUsers(dealershipID uuid.UUID, role, status *string) ([]User, error) {
	url := fmt.Sprintf("%s/users?dealership_id=%s", baseURL, dealershipID)
	if role != nil {
		url += fmt.Sprintf("&role=%s", *role)
	}
	if status != nil {
		url += fmt.Sprintf("&status=%s", *status)
	}

	resp, err := http.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var users []User
	if err := json.NewDecoder(resp.Body).Decode(&users); err != nil {
		return nil, err
	}

	return users, nil
}

func updateUser(userID, dealershipID uuid.UUID, updates map[string]string) (*User, error) {
	body, _ := json.Marshal(updates)
	url := fmt.Sprintf("%s/users/%s?dealership_id=%s", baseURL, userID, dealershipID)

	req, _ := http.NewRequest(http.MethodPut, url, bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var user User
	if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
		return nil, err
	}

	return &user, nil
}

func updateRole(userID, dealershipID uuid.UUID, role string) error {
	body, _ := json.Marshal(map[string]string{"role": role})
	url := fmt.Sprintf("%s/users/%s/role?dealership_id=%s", baseURL, userID, dealershipID)

	req, _ := http.NewRequest(http.MethodPut, url, bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("unexpected status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	return nil
}

func savePreferences(userID uuid.UUID, prefs map[string]interface{}) error {
	body, _ := json.Marshal(prefs)
	url := fmt.Sprintf("%s/users/%s/preferences", baseURL, userID)

	req, _ := http.NewRequest(http.MethodPut, url, bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("unexpected status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	return nil
}

func getActivity(userID uuid.UUID, limit int) ([]map[string]interface{}, error) {
	url := fmt.Sprintf("%s/users/%s/activity?limit=%d", baseURL, userID, limit)

	resp, err := http.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var activities []map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&activities); err != nil {
		return nil, err
	}

	return activities, nil
}

func validateEmail(email string, dealershipID uuid.UUID) (bool, error) {
	body, _ := json.Marshal(map[string]interface{}{
		"email":         email,
		"dealership_id": dealershipID,
	})

	resp, err := http.Post(baseURL+"/users/validate-email", "application/json", bytes.NewBuffer(body))
	if err != nil {
		return false, err
	}
	defer resp.Body.Close()

	var result map[string]bool
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return false, err
	}

	return result["exists"], nil
}

func deleteUser(userID, dealershipID uuid.UUID) error {
	url := fmt.Sprintf("%s/users/%s?dealership_id=%s", baseURL, userID, dealershipID)

	req, _ := http.NewRequest(http.MethodDelete, url, nil)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("unexpected status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	return nil
}
