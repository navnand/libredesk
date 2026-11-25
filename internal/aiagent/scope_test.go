package aiagent

import (
	"testing"

	"github.com/jmoiron/sqlx/types"
)

func TestHelpScope(t *testing.T) {
	scopes := []inboxHelpScope{
		{InboxID: 1, HelpCenterID: 2},
		{InboxID: 3, HelpCenterID: 3},
		{InboxID: 4, HelpCenterID: 4, AIHelpCenterIDs: types.JSONText(`[4, 3]`), AIPrivate: true},
		{InboxID: 5, HelpCenterID: 0, AIHelpCenterIDs: types.JSONText(`[4, 2]`)},
	}
	cases := []struct {
		name       string
		inbox      int
		restricted bool
		allowed    []int
		denied     []int
	}{
		{"unlisted inbox skips another inbox's private help center", 1, true, []int{2, 3, 9}, []int{4}},
		{"owner searches only its listed help centers", 4, true, []int{4, 3}, []int{2, 9}},
		{"listing a private help center does not unlock it", 5, true, []int{2}, []int{4, 3}},
		{"unknown inbox skips private help centers", 99, true, []int{2, 3}, []int{4}},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			s := newHelpScope(c.inbox, scopes)
			if s.restricted() != c.restricted {
				t.Fatalf("restricted = %v, want %v", s.restricted(), c.restricted)
			}
			for _, hc := range c.allowed {
				if !s.allows(hc) {
					t.Errorf("help center %d denied, want allowed", hc)
				}
			}
			for _, hc := range c.denied {
				if s.allows(hc) {
					t.Errorf("help center %d allowed, want denied", hc)
				}
			}
		})
	}
}

func TestHelpScopeUnrestricted(t *testing.T) {
	s := newHelpScope(1, []inboxHelpScope{{InboxID: 1, HelpCenterID: 2}, {InboxID: 3, HelpCenterID: 3}})
	if s.restricted() {
		t.Fatal("restricted without any listed or private help centers")
	}
	if !s.allows(2) || !s.allows(3) {
		t.Fatal("unrestricted scope denied a help center")
	}
}

func TestHelpScopeBadList(t *testing.T) {
	s := newHelpScope(1, []inboxHelpScope{{InboxID: 1, AIHelpCenterIDs: types.JSONText(`"x"`)}})
	if s.restricted() {
		t.Fatal("unreadable list restricted the scope")
	}
}
