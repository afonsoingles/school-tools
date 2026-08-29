<p align="center">
  <img src="./frontend/public/logo.png" alt="School Tools" width="176" />
</p>

# School Tools
[Production instance](https://school-tools.afonsoingles.dev) • [Backend](#backend) • [Frontend](#frontend) • [Questions](#questions)

## Overview
I have used Notion for a long time now. It lacks many features specialized on students day-to-day life. 

School Tools is my attempt to fix that problem. This project currently let's you create your own class schedule, add evaluations to it, and sync it to your prefered Calendar. Over time, i want this to evolve, and add more features, such as homework tracking, push notifications (VAPID) and more.

## Run the project
This project is a monorepo, meaning that the frontend and backend are in the same repository, besides them using different stacks.

First, clone the repository and enter it.  
`git clone https://github.com/afonsoingles/school-tools && cd school-tools`

Now, there are different steps to run the backend and frontend.

### Backend
The backend is powered by python, so you will need to have python and `uv` installed.  
To run the backend, you need to:  
1. **Enter the backend folder**  
`cd backend`

2. **Download the dependencies**  
`uv sync`

3. **Fill in the .env**  
The `.env.example` file shows the necessary required variables. The sentry DSN is optional.  
In development, emails are stored in `/tmp/emails`. You can override this by setting the environment to production.

4. **Run it!**  
`uv run uvicorn main:app --reload`

You do not need to expose the backend publicly, as the frontend already does that job for you (it proxies requests starting with /api to the API) but the backend must be exposed to the frontend.
### Frontend
The frontend of the project is powered by Next.js. Run the following commands:  

1. **Enter the frontend folder**  
`cd frontend`

2. **Install dependencies**  
`npm install`

3. **Fill in the .env**   
You can find all necessary variables in `.env.example`.

4. **Run it!**  
`npm run dev`

## Questions
If you have any questions about the project, feel free to email me at [hi@afonsoingles.dev](mailto:hi@afonsoingles.dev).  
This repo is also open to PR's!