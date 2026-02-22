package tinybird

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"

	"github.com/rs/zerolog/log"
)

func getBaseURL() string {
	if tinybirdURL := os.Getenv("TINYBIRD_URL"); tinybirdURL != "" {
		return tinybirdURL + "/v0/events"
	}
	return "http://tinybird-local:7181/v0/events"
}

// resolveToken returns the provided apiKey if non-empty, otherwise
// reads the admin token from the shared .tinyb auth file (set via
// TINYBIRD_AUTH_FILE env var in Docker). No retries needed since
// the dependency chain guarantees the file exists by startup.
func resolveToken(apiKey string) string {
	if apiKey != "" {
		return apiKey
	}

	authFile := os.Getenv("TINYBIRD_AUTH_FILE")
	if authFile == "" {
		return ""
	}

	type tinybConfig struct {
		Token string `json:"token"`
	}

	data, err := os.ReadFile(authFile)
	if err != nil {
		log.Warn().Err(err).Str("path", authFile).Msg("failed to read tinybird auth file")
		return ""
	}

	var cfg tinybConfig
	if err := json.Unmarshal(data, &cfg); err != nil {
		log.Warn().Err(err).Msg("failed to parse tinybird auth file")
		return ""
	}

	if cfg.Token != "" {
		log.Info().Msg("resolved tinybird token from auth file")
	}
	return cfg.Token
}

type Client interface {
	SendEvent(ctx context.Context, event any, dataSourceName string) error
}

type client struct {
	httpClient *http.Client
	apiKey     string
	baseURL    string
}

func NewClient(httpClient *http.Client, apiKey string) Client {
	resolved := resolveToken(apiKey)
	log.Info().
		Int("keyLen", len(resolved)).
		Str("baseURL", getBaseURL()).
		Msg("tinybird client initialized")
	return client{
		httpClient: httpClient,
		apiKey:     resolved,
		baseURL:    getBaseURL(),
	}
}

func (c client) SendEvent(ctx context.Context, event any, dataSourceName string) error {
	requestURL, err := url.Parse(c.baseURL)
	if err != nil {
		log.Ctx(ctx).Error().Err(err).Msg("unable to parse url")
		return fmt.Errorf("unable to parse url: %w", err)
	}

	q := requestURL.Query()
	q.Add("name", dataSourceName)
	requestURL.RawQuery = q.Encode()

	var payload bytes.Buffer
	if err := json.NewEncoder(&payload).Encode(event); err != nil {
		log.Ctx(ctx).Error().Err(err).Msg("unable to encode payload")
		return fmt.Errorf("unable to encode payload: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, requestURL.String(), bytes.NewReader(payload.Bytes()))
	if err != nil {
		log.Ctx(ctx).Error().Err(err).Msg("unable to create request")
		return fmt.Errorf("unable to create request: %w", err)
	}
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.apiKey))

	resp, err := c.httpClient.Do(req)
	if err != nil {
		log.Ctx(ctx).Error().Err(err).Msg("unable to send request")
		return fmt.Errorf("unable to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusAccepted {
		body, _ := io.ReadAll(resp.Body)
		log.Ctx(ctx).Error().
			Str("status", resp.Status).
			Str("url", requestURL.String()).
			Str("body", string(body)).
			Int("tokenLen", len(c.apiKey)).
			Msg("unexpected status code")
		return fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	return nil
}
