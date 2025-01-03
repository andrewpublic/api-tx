package main

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"log"
	"os"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

var awsS3Client *s3.Client

func uploadToS3(tx []TxMapped) {
	if awsS3Client == nil {
		configS3()
	}

	bucket := "api-tx"
	filePath := "transactions.csv"

	file, err := os.Open(filePath)
	if err != nil {
		fmt.Fprintln(os.Stderr, "Error opening file: ", err)
		return
	}
	defer file.Close()

	key := "transactions.csv"

	// Read the contents of the file into a buffer
	var buf bytes.Buffer
	if _, err := io.Copy(&buf, file); err != nil {
		fmt.Fprintln(os.Stderr, "Error reading file:", err)
		return
	}

	// This uploads the contents of the buffer to S3
	_, err = awsS3Client.PutObject(context.TODO(), &s3.PutObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(key),
		Body:   bytes.NewReader(buf.Bytes()),
	})
	if err != nil {
		fmt.Println("Error uploading file:", err)
		return
	}

	fmt.Println("File uploaded successfully!!!")
}

func configS3() {
	cfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithRegion("ap-southeast-2"),
	)
	if err != nil {
		log.Fatalf("unable to load SDK config, %v", err)
	}

	awsS3Client = s3.NewFromConfig(cfg)
}
