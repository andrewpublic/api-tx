package main

import "github.com/gorilla/mux"

func loadRoutes() *mux.Router {
	router := mux.NewRouter()

	// https://example.com/
	router.HandleFunc("/", reqFromUser).Methods("POST")

	return router
}
