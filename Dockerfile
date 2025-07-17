FROM node:16
RUN apt-get update && apt-get install -y ffmpeg python3 python3-pip
RUN pip3 install yt-dlp
RUN npm install express
WORKDIR /app
COPY . .
CMD ["node", "index.js"]
