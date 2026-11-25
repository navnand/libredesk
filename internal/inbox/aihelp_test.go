package inbox

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestKeepLivechatAIHelp(t *testing.T) {
	current := json.RawMessage(`{"help":{"help_center_id":4,"ai_help_center_ids":[4,3],"ai_private":true},"brand_name":"Acme"}`)

	t.Run("keeps saved keys when the update leaves them out", func(t *testing.T) {
		out, err := keepLivechatAIHelp(current, json.RawMessage(`{"help":{"help_center_id":4},"brand_name":"Globex"}`))
		require.NoError(t, err)
		require.JSONEq(t, `{"help":{"help_center_id":4,"ai_help_center_ids":[4,3],"ai_private":true},"brand_name":"Globex"}`, string(out))
	})

	t.Run("update values win", func(t *testing.T) {
		in := json.RawMessage(`{"help":{"help_center_id":4,"ai_help_center_ids":[],"ai_private":false}}`)
		out, err := keepLivechatAIHelp(current, in)
		require.NoError(t, err)
		require.JSONEq(t, string(in), string(out))
	})

	t.Run("adds a help object when the update has none", func(t *testing.T) {
		out, err := keepLivechatAIHelp(current, json.RawMessage(`{"brand_name":"Globex"}`))
		require.NoError(t, err)
		require.JSONEq(t, `{"help":{"ai_help_center_ids":[4,3],"ai_private":true},"brand_name":"Globex"}`, string(out))
	})

	t.Run("nothing saved leaves the update as sent", func(t *testing.T) {
		in := json.RawMessage(`{"help":{"help_center_id":2}}`)
		out, err := keepLivechatAIHelp(json.RawMessage(`{"help":{"help_center_id":2}}`), in)
		require.NoError(t, err)
		require.Equal(t, string(in), string(out))
	})

	t.Run("invalid update is an error", func(t *testing.T) {
		_, err := keepLivechatAIHelp(current, json.RawMessage(`{"help":`))
		require.Error(t, err)
	})
}
