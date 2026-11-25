package email

import (
	"testing"

	"github.com/emersion/go-imap/v2"
)

func TestContactAddress(t *testing.T) {
	forms := imap.Address{Name: "Forms", Mailbox: "forms", Host: "example.com"}
	visitor := imap.Address{Name: "Jane Doe", Mailbox: "jane", Host: "acme.test"}
	other := imap.Address{Name: "Bob", Mailbox: "bob", Host: "globex.test"}

	tests := []struct {
		name    string
		senders []string
		env     imap.Envelope
		want    string
	}{
		{"listed sender with reply-to", []string{"Forms@Example.com"}, imap.Envelope{From: []imap.Address{forms}, ReplyTo: []imap.Address{visitor}}, "jane@acme.test"},
		{"listed sender without reply-to", []string{"forms@example.com"}, imap.Envelope{From: []imap.Address{forms}}, "forms@example.com"},
		{"listed sender replying to itself", []string{"forms@example.com"}, imap.Envelope{From: []imap.Address{forms}, ReplyTo: []imap.Address{forms}}, "forms@example.com"},
		{"unlisted sender keeps from", []string{"forms@example.com"}, imap.Envelope{From: []imap.Address{other}, ReplyTo: []imap.Address{visitor}}, "bob@globex.test"},
		{"no senders listed", nil, imap.Envelope{From: []imap.Address{forms}, ReplyTo: []imap.Address{visitor}}, "forms@example.com"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			e := &Email{replyToSenders: addressSet(tt.senders)}
			addr := e.contactAddress(&tt.env)
			if got := addr.Addr(); got != tt.want {
				t.Fatalf("contactAddress() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestContactAddressName(t *testing.T) {
	e := &Email{replyToSenders: addressSet([]string{"forms@example.com"})}
	env := imap.Envelope{
		From:    []imap.Address{{Name: "Forms", Mailbox: "forms", Host: "example.com"}},
		ReplyTo: []imap.Address{{Name: "Jane Doe", Mailbox: "jane", Host: "acme.test"}},
	}
	first, last := getContactName(e.contactAddress(&env))
	if first != "Jane" || last != "Doe" {
		t.Fatalf("name = %q %q, want Jane Doe", first, last)
	}
}

func TestAddressSet(t *testing.T) {
	set := addressSet([]string{" A@Example.com ", "", "b@example.com"})
	if len(set) != 2 {
		t.Fatalf("len = %d, want 2", len(set))
	}
	if _, ok := set["a@example.com"]; !ok {
		t.Fatal("a@example.com missing")
	}
	e := &Email{replyToSenders: set}
	if got := e.replyToSenderList(); len(got) != 2 || got[0] != "a@example.com" || got[1] != "b@example.com" {
		t.Fatalf("replyToSenderList() = %v", got)
	}
}
