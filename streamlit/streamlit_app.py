import streamlit as st
import matplotlib.pyplot as plt
import pandas as pd
from st_files_connection import FilesConnection

# Create connection object and retrieve file contents.
# Specify input format is a csv and to cache the result for 600 seconds.
conn = st.connection('s3', type=FilesConnection)
df = conn.read("api-tx/transactions.csv", input_format="csv", ttl=600)

# df.plot.scatter(x='Time',y='Cost',c='Red')

st.write(df)

st.area_chart(df, x="Time", y="Cost")

st.bar_chart(df, x="Time", y="Cost")

st.bar_chart(df, horizontal=True, x="Time", y="Cost")

st.line_chart(df, x="Time", y="Cost")

# st.map(df)

st.scatter_chart(df, x="Time", y="Cost")



# json = df.to_json(orient = "records")

# Print results.
# for row in df.itertuples():
#     st.write(f"{row.Time}: {row.Cost} - {row.Details}")

