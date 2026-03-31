package checker

import (
	"crypto/sha256"
	"crypto/x509"
	"encoding/hex"
	"math"
	"time"
)

// CertInfo holds TLS certificate metadata extracted during HTTP checks.
type CertInfo struct {
	ExpiryDays   int    `json:"certExpiryDays"`
	Valid        bool   `json:"certValid"`
	Issuer       string `json:"certIssuer"`
	ExpiresAt    int64  `json:"certExpiresAt"`
	Fingerprint  string `json:"certFingerprint"`
	ErrorMessage string `json:"certError,omitempty"`
}

// VerifyAndExtract is a VerifyPeerCertificate callback for use with
// InsecureSkipVerify: true. It performs manual chain verification and
// extracts certificate metadata regardless of validity.
func (ci *CertInfo) VerifyAndExtract(rawCerts [][]byte, _ [][]*x509.Certificate) error {
	if len(rawCerts) == 0 {
		ci.Valid = false
		ci.ErrorMessage = "no certificates presented"
		return nil
	}

	leaf, err := x509.ParseCertificate(rawCerts[0])
	if err != nil {
		ci.Valid = false
		ci.ErrorMessage = "failed to parse certificate"
		return nil
	}

	ci.ExpiresAt = leaf.NotAfter.UnixMilli()
	ci.Issuer = leaf.Issuer.CommonName
	ci.Fingerprint = sha256Hex(rawCerts[0])

	now := time.Now().UTC()
	daysUntilExpiry := leaf.NotAfter.Sub(now).Hours() / 24
	ci.ExpiryDays = int(math.Floor(daysUntilExpiry))

	intermediates := x509.NewCertPool()
	for _, raw := range rawCerts[1:] {
		cert, err := x509.ParseCertificate(raw)
		if err != nil {
			continue
		}
		intermediates.AddCert(cert)
	}

	opts := x509.VerifyOptions{
		Intermediates: intermediates,
		CurrentTime:   now,
	}
	_, verifyErr := leaf.Verify(opts)
	ci.Valid = verifyErr == nil
	if verifyErr != nil {
		ci.ErrorMessage = verifyErr.Error()
	}

	return nil
}

func sha256Hex(data []byte) string {
	h := sha256.Sum256(data)
	return hex.EncodeToString(h[:])
}
