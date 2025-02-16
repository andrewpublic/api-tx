package main

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

func loadEnv() {
	err := godotenv.Load()
	if err != nil {
		log.Println("Error loading env file")
	}

	if os.Getenv("AWS_ACCESS_KEY_ID") == "" || os.Getenv("AWS_SECRET_ACCESS_KEY") == "" {
		log.Println("Warning: Missing AWS Access Environment Variables")
		log.Println("Switching to local mode")
	} else {
		os.Setenv("ENVIRONMENT", "prod")
	}

	os.Setenv("ENVIRONMENT", "local")
}
