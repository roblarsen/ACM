package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"log"

	"github.com/segmentio/kafka-go"
)

type BalanceChangeEvent struct {
	AccountID string  `json:"account_id"`
	Delta     float64 `json:"delta"`
	EventID   string  `json:"event_id"`
}

func ConsumeBalanceStream(ctx context.Context, reader *kafka.Reader, db *sql.DB) {
	for {
		m, err := reader.ReadMessage(ctx)
		if err != nil {
			log.Printf("Error reading kafka message: %v", err)
			continue
		}

		var event BalanceChangeEvent
		if err := json.Unmarshal(m.Value, &event); err != nil {
			log.Printf("Malformed payload: %v", err)
			continue // Skip poison pill
		}

		// Update balance directly
		query := `UPDATE accounts SET balance = balance + $1 WHERE id = $2`
		_, err = db.ExecContext(ctx, query, event.Delta, event.AccountID)
		if err != nil {
			log.Printf("Failed to update database for account %s: %v", event.AccountID, err)
			// Message is already auto-committed by kafka-go ReadMessage
		}
	}
}