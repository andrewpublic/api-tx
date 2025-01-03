# Up Bank API Magic

🥨 Preview images shown at the bottom 🥨

### Instructions to run locally
🍞 First create a .env file in the root of your local directory 🍞

🍒 Add the following:
* AWS_ACCESS_KEY_ID=some_aws_public_key
* AWS_SECRET_ACCESS_KEY=some_aws_secret_key

🍣 Running backend locally:
* open a terminal
* brew install go
* cd api-tx/backend
* go run server.go http-fetch.go aws-utils.go csv-convert.go

> [!IMPORTANT]  
> Yes, we will clean it up later!

🍏 Running frontend locally:
* open another terminal
* cd api-tx/frontend
* npm install
* npm run dev

⛈️ Now open a web browser and enter http://localhost/5173/ ⛈️

🍇 Retrieve your Up Bank API Key:
* go into up bank mobile app
* click "Up" then "Data Sharing"
* get a Personal Access Token
* copy and paste into web browser field
** also you should save it somewhere, we don't store it in our system

> [!TIP]
> Your API Key is safe, however your transaction data will get saved and uploaded to AWS S3 (despite what the website says)

💡💡💡💡💡💡💡💡💡💡💡💡  
🥳 You should see some stuff 🥳  
💡💡💡💡💡💡💡💡💡💡💡💡

> [!CAUTION]
> TODO: STREAMLIT INTEGRATION

### ----------- Preview -------------


![2CB6A7D0-24EB-4BEB-B609-41619F32266F](https://github.com/user-attachments/assets/9e1bbf80-8e76-4819-b986-c798340f1b85)

![6E7F52A1-E274-4A8F-B82E-3005714A166B_1_201_a](https://github.com/user-attachments/assets/2c5603b1-3645-438f-b03a-764f975b57a1)

![D68C7D10-4953-40EF-BEF6-29DEF90C5F94](https://github.com/user-attachments/assets/c82e11ab-3037-4d99-990b-71a84dc6780a)

