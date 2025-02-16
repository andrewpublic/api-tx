package main

import (
    "log"
    "time"
    
    "github.com/go-co-op/gocron/v2"
)

func main() {
    s, err := gocron.NewScheduler()
    if err != nil {
        log.Printf("Error 1")
    }

    // All of this is from gocron readme
    j, err := s.NewJob(
        gocron.DurationJob(
            10*time.Second,
        ),
        gocron.NewTask( // what the hell is this syntax
            func(my string) {
                log.Printf("Message: %s", my)
            },
            "hello",
        ),
    )
    if err != nil {
        log.Printf("Error 2")
    }

    log.Printf("Job ID: %s", j.ID())

    s.Start()

    select {
    case <-time.After(time.Minute):
    }

    err = s.Shutdown()
    if err != nil {
        log.Printf("Error 3")
    }
}
