package aiagent

import (
	"encoding/json"
	"fmt"

	aimodels "github.com/abhinavxd/libredesk/internal/ai/models"
	"github.com/jmoiron/sqlx/types"
)

// inboxHelpScope is one live chat inbox's help center settings for AI assistants.
type inboxHelpScope struct {
	InboxID         int            `db:"id"`
	HelpCenterID    int            `db:"help_center_id"`
	AIHelpCenterIDs types.JSONText `db:"ai_help_center_ids"`
	AIPrivate       bool           `db:"ai_private"`
}

// helpScope is the set of help centers an assistant may search in one inbox.
type helpScope struct {
	listed map[int]bool
	hidden map[int]bool
}

// newHelpScope builds the scope for inboxID: its listed help centers (all when none are listed),
// minus help centers that another inbox keeps private.
func newHelpScope(inboxID int, scopes []inboxHelpScope) helpScope {
	owners := map[int]map[int]bool{}
	s := helpScope{listed: map[int]bool{}, hidden: map[int]bool{}}
	for _, sc := range scopes {
		if sc.AIPrivate && sc.HelpCenterID > 0 {
			if owners[sc.HelpCenterID] == nil {
				owners[sc.HelpCenterID] = map[int]bool{}
			}
			owners[sc.HelpCenterID][sc.InboxID] = true
		}
		if sc.InboxID == inboxID && len(sc.AIHelpCenterIDs) > 0 {
			var ids []int
			if err := json.Unmarshal(sc.AIHelpCenterIDs, &ids); err == nil {
				for _, id := range ids {
					if id > 0 {
						s.listed[id] = true
					}
				}
			}
		}
	}
	for hc, inboxes := range owners {
		if !inboxes[inboxID] {
			s.hidden[hc] = true
		}
	}
	return s
}

// restricted reports whether the scope excludes any help center.
func (s helpScope) restricted() bool {
	return len(s.listed) > 0 || len(s.hidden) > 0
}

// allows reports whether articles in help center hc may be searched.
func (s helpScope) allows(hc int) bool {
	if s.hidden[hc] {
		return false
	}
	return len(s.listed) == 0 || s.listed[hc]
}

// knowledgeFilter returns which search results an assistant answering in inboxID may use; nil allows all.
func (m *Manager) knowledgeFilter(inboxID int) (func(aimodels.SearchResult) bool, error) {
	var scopes []inboxHelpScope
	if err := m.q.GetInboxAIHelpScopes.Select(&scopes); err != nil {
		return nil, fmt.Errorf("fetching inbox help scopes: %w", err)
	}
	scope := newHelpScope(inboxID, scopes)
	if !scope.restricted() {
		return nil, nil
	}
	var rows []struct {
		ID           int `db:"id"`
		HelpCenterID int `db:"help_center_id"`
	}
	if err := m.q.GetHelpArticleCenters.Select(&rows); err != nil {
		return nil, fmt.Errorf("fetching help article centers: %w", err)
	}
	centers := make(map[int]int, len(rows))
	for _, r := range rows {
		centers[r.ID] = r.HelpCenterID
	}
	return func(r aimodels.SearchResult) bool {
		if r.SourceType != aimodels.SourceHelpArticle {
			return true
		}
		hc, ok := centers[r.SourceID]
		return ok && scope.allows(hc)
	}, nil
}
