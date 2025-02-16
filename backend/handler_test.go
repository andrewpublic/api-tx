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
