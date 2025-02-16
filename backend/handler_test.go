package main

import "testing"

func TestHello(t *testing.T) {
    t.Run("SubTest 1: Detailed hello world", func(t *testing.T) {
        got, _ := Hello("Andrew")
        want := "Hello, Andrew!"

        if got != want {
            t.Errorf("got %q want %q", got, want)
        }
    })
    t.Run("SubTest2: Default hello world", func(t *testing.T) {
        got, _ := Hello()
        want := "Hello, world!"

        if got != want {
            t.Errorf("got %q want %q", got, want)
        }
    })
}
