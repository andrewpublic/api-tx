package main

import "testing"

func TestHandler(t *testing.T) {
	t.Run("Return hello world response", func(t *testing.T) {
		got, _ := handler()
		want := HttpResponse{
			StatusCode: 200,
			Body:       `Hello World!`,
		}
		assertCorrectResponse(t, got, want)
	})
}

func assertCorrectResponse(t testing.TB, got, want HttpResponse) {
	t.Helper() // tells test runner to report line number from where this
	// assert helper function is called
	if got != want {
		t.Errorf("got %q want %q", got, want)
	}
}

// 1. Take input (API Key) and unmarshal
// 2. Load in queue environment variables
// 3. Push to queue

func TestPOSTApiKey(t *testing.T) {
    t.Run("returns OK 200", func(t *testing.T) {
        request, _ := http.NewRequest(http.MethodGet, "/register", nil)
        response := httptest.NewRecorder()
        
        PlayerServer(response, request)

        got := response.Body.String()
        want := "20"

        if got != want {
            t.Errorf("got %q, want %q", got, want)
        }
    })
}
