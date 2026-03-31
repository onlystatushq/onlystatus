package checker

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"github.com/rs/zerolog/log"
)

type UpdateData struct {
	MonitorId       string `json:"monitorId"`
	Status          string `json:"status"`
	Message         string `json:"message,omitempty"`
	Region          string `json:"region"`
	CronTimestamp   int64  `json:"cronTimestamp"`
	StatusCode      int    `json:"statusCode,omitempty"`
	Latency         int64  `json:"latency,omitempty"`
	CertExpiryDays  int    `json:"certExpiryDays,omitempty"`
	CertValid       bool   `json:"certValid,omitempty"`
	CertFingerprint string `json:"certFingerprint,omitempty"`
}

func getWorkflowsURL() string {
	if url := os.Getenv("WORKFLOWS_URL"); url != "" {
		return url + "/updateStatus"
	}
	return "http://workflows:4030/updateStatus"
}

func UpdateStatus(ctx context.Context, updateData UpdateData) error {
	url := getWorkflowsURL()
	secret := os.Getenv("CRON_SECRET")

	payloadBuf := new(bytes.Buffer)
	if err := json.NewEncoder(payloadBuf).Encode(updateData); err != nil {
		log.Ctx(ctx).Error().Err(err).Msg("error while encoding update status payload")
		return fmt.Errorf("json.Encode: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, payloadBuf)
	if err != nil {
		log.Ctx(ctx).Error().Err(err).Msg("error while creating update status request")
		return fmt.Errorf("http.NewRequest: %w", err)
	}
	req.Header.Set("Authorization", "Basic "+secret)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Ctx(ctx).Error().Err(err).Msg("error while sending update status request")
		return fmt.Errorf("http.Do: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		log.Ctx(ctx).Error().Int("statusCode", resp.StatusCode).Msg("update status returned error")
		return fmt.Errorf("updateStatus returned status %d", resp.StatusCode)
	}

	return nil
}
