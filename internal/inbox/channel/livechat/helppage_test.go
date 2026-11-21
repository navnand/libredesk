package livechat

import (
	"encoding/json"
	"strings"
	"testing"
)

func sampleRules() HelpConfig {
	rule := func(name string, pages ...string) HelpPageRule {
		return HelpPageRule{ID: name, Name: name, Pages: pages, ArticleIDs: []int{1}}
	}
	return HelpConfig{PageRules: []HelpPageRule{
		rule("signed out", "/session*", "/forgot_passwords*", "/signup*"),
		rule("workspace tasks", "/workspace/*/tasks*"),
		rule("workspace", "/workspace/*"),
		rule("admin", "/admin", "/admin/*"),
		rule("app only", "app.example.com/reports*"),
		rule("member", "/*"),
	}}
}

func TestMatchPageFirstMatchWins(t *testing.T) {
	help := sampleRules()
	cases := map[string]string{
		"https://app.example.com/session/new":                  "signed out",
		"https://app.example.com/forgot_passwords/new":         "signed out",
		"https://app.example.com/workspace/65/tasks":             "workspace tasks",
		"https://app.example.com/workspace/812/tasks/9/edit":     "workspace tasks",
		"https://app.example.com/workspace/65/members":         "workspace",
		"https://app.example.com/workspace/65":                   "workspace",
		"https://app.example.com/admin":                      "admin",
		"https://app.example.com/admin/tasks":                "admin",
		"https://app.example.com/team/55/boards": "member",
		"https://app.example.com/reports/3":                   "app only",
		"https://other.example.com/reports/3":                 "member",
		"https://app.example.com/workspace/65/tasks?page=2#top":  "workspace tasks",
		"https://app.example.com/dashboard":                    "member",
	}
	for url, want := range cases {
		rule, ok := help.MatchPage(url)
		if !ok || rule.Name != want {
			t.Errorf("%s: got %q (matched %v), want %q", url, rule.Name, ok, want)
		}
	}
}

func TestMatchPageNoMatch(t *testing.T) {
	help := HelpConfig{PageRules: []HelpPageRule{{ID: "a", Name: "a", Pages: []string{"/workspace/*"}}}}
	for _, url := range []string{"", "https://app.example.com/dashboard", "not a url", "ftp://app.example.com/workspace/1"} {
		if rule, ok := help.MatchPage(url); ok {
			t.Errorf("%q matched %q", url, rule.Name)
		}
	}
	if _, ok := (HelpConfig{}).MatchPage("https://app.example.com/"); ok {
		t.Error("no rules matched a page")
	}
}

func TestHelpPageRuleValidate(t *testing.T) {
	valid := HelpPageRule{ID: "r1", Name: "Workspace", Pages: []string{"/workspace/*"}, ArticleIDs: []int{}}
	if err := valid.Validate(); err != nil {
		t.Fatalf("valid rule: %v", err)
	}
	tooMany := func(n int) []int {
		ids := make([]int, n)
		for i := range ids {
			ids[i] = i + 1
		}
		return ids
	}
	patterns := make([]string, MaxHelpPageRulePatterns+1)
	for i := range patterns {
		patterns[i] = "/p"
	}
	bad := map[string]HelpPageRule{
		"id":       {Name: "x", Pages: []string{"/a"}},
		"name":     {ID: "r", Name: " ", Pages: []string{"/a"}},
		"longname": {ID: "r", Name: strings.Repeat("n", 129), Pages: []string{"/a"}},
		"nopages":  {ID: "r", Name: "x"},
		"blank":    {ID: "r", Name: "x", Pages: []string{" "}},
		"patterns": {ID: "r", Name: "x", Pages: patterns},
		"articles": {ID: "r", Name: "x", Pages: []string{"/a"}, ArticleIDs: tooMany(MaxHelpPageRuleArticles + 1)},
		"zeroid":   {ID: "r", Name: "x", Pages: []string{"/a"}, ArticleIDs: []int{0}},
	}
	for name, rule := range bad {
		if rule.Validate() == nil {
			t.Errorf("%s: invalid rule passed", name)
		}
	}
}

func TestUnmarshalFillsEmptyPageRules(t *testing.T) {
	var config Config
	if err := json.Unmarshal([]byte(`{"help":{"page_rules":[{"id":"r","name":"x"}]}}`), &config); err != nil {
		t.Fatal(err)
	}
	if config.Help.PageRules[0].Pages == nil || config.Help.PageRules[0].ArticleIDs == nil {
		t.Fatal("rule lists left nil")
	}
	var empty Config
	if err := json.Unmarshal([]byte(`{}`), &empty); err != nil {
		t.Fatal(err)
	}
	if empty.Help.PageRules == nil {
		t.Fatal("page_rules left nil")
	}
}
