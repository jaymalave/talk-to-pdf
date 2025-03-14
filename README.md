# Project Name

AutoPDF - Transform the way you read, listen, and interact with PDFs.

https://autopdf.jaymalve.dev

A NextJS-based application that leverages MongoDB, Tailwind CSS, shadcn UI components, and React PDF for an efficient and modern web PDF experience.

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)

## Overview

This project is built using a modern tech stack to deliver both robust server-side capabilities and a dynamic client-side experience. It integrates a secure backend with NextJS, uses MongoDB for data persistence, and leverages Tailwind CSS with shadcn UI components for rapid UI development. Additionally, the React PDF package is used for handling PDF files within the application.

## Tech Stack

- **NextJS**: Serves as both the frontend and backend framework, offering server-side rendering, API routes, and a seamless development experience.
- **MongoDB**: A NoSQL database used for storing and managing application data efficiently.
- **Tailwind CSS**: A utility-first CSS framework that simplifies custom styling with pre-defined classes.
- **shadcn UI**: A component kit that works alongside Tailwind CSS to provide a set of pre-designed, customizable UI components.
- **React PDF**: An npm package for rendering and handling PDF documents within the React environment.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher)
- [npm](https://www.npmjs.com/)
- A MongoDB instance (local or via [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))

### Installation

1. **Clone the Repository**

   ```bash
   git clone https://github.com/jaymalave/talk-to-pdf.git
   cd your-repo
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

### Environment Variables

```env
PLAY_AI_API_KEY=YOUR_PLAY_AI_API_KEY
PLAY_AI_USER_ID=YOUR_PLAY_AI_USER_ID

NEXT_PUBLIC_PLAY_AI_API_KEY=YOUR_PLAY_AI_API_KEY
NEXT_PUBLIC_PLAY_AI_USER_ID=YOUR_PLAY_AI_USER_ID

MONGODB_URI=YOUR_MONGODB_URI
```

### Explanation of Environment Variables

- **PLAY_AI_API_KEY**:  
  Your secret API key for the Play AI service. This key is used on the server-side to authenticate API requests and should remain confidential.
- **PLAY_AI_USER_ID**:  
  Your unique user identifier associated with the Play AI service. This is used on the backend for authentication and user-specific operations.
- **NEXT_PUBLIC_PLAY_AI_API_KEY**:  
  The public version of the Play AI API key. This is exposed to the client-side to enable frontend interactions with the Play AI service. Note that this key should have limited permissions compared to the secret key.
- **NEXT_PUBLIC_PLAY_AI_USER_ID**:  
  The public user identifier for the Play AI service. This variable is used on the frontend to help identify the user during client-side operations.
- **MONGODB_URI**:  
  The connection string for your MongoDB database. This URI should include your MongoDB credentials and connection details. For MongoDB Atlas, it usually looks like:  
  `mongodb+srv://<username>:<password>@cluster0.your-cluster.mongodb.net/`

## Running the Application

To start the development server, run the following command in the root directory:

bash

Copy

`npm run dev`

Open your browser and navigate to http://localhost:3000 to see the application in action.


