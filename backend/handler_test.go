package main

import "testing"

func TestHello(t *testing.T) {
    t.Run("SubTest 1: Detailed hello world", func(t *testing.T) {
        got, _ := Hello("Andrew")
        want := "Hello, Andrew!"
        assertCorrectMessage(t, got, want)
    })
    t.Run("SubTest2: Default hello world", func(t *testing.T) {
        got, _ := Hello()
        want := "Hello, world!"
        assertCorrectMessage(t, got, want)
    })
}

func assertCorrectMessage(t testing.TB, got, want string) {
    t.Helper() // tells test runner to report line number from where this
               // assert helper function is called
    if got != want {
        t.Errorf("got %q want %q", got, want)
    }
}
