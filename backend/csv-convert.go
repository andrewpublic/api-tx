package main

import (
	"encoding/csv"
	"log"
	"os"
	"strconv"
)

func convertToCsv(stringSlice [][]string) {
	// Create a file
	file, err := os.Create("transactions.csv")
	if err != nil {
		log.Fatalf("Failed to create file: %s", err)
	}
	defer file.Close()

	writer := csv.NewWriter(file)
	writer.WriteAll(stringSlice) // calls Flush internally

	if err := writer.Error(); err != nil {
		log.Fatalln("error writing csv:", err)
	}
}

func mapTxToStringSlice(txMappedSlice []TxMapped) [][]string {
	stringSliceForCsv := [][]string{
		{"Time", "Cost", "Category", "Details"},
	}

	for _, t := range txMappedSlice {
		stringSliceForCsv = append(stringSliceForCsv, []string{
			strconv.FormatInt(t.Time, 10), t.Cost, t.Details,
		})
	}

	return stringSliceForCsv
}
