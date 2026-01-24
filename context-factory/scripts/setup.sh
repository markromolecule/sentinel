#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting Sentinel setup procedure...${NC}"

# 1. Check for pnpm
if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}pnpm is not installed. Installing via npm...${NC}"
    if command -v npm &> /dev/null; then
        npm install -g pnpm
    else
        echo "Error: npm is not installed. Please install Node.js."
        exit 1
    fi
fi

# 2. Install dependencies
echo -e "${BLUE}Installing dependencies...${NC}"
pnpm install

# 3. Environment Variable Setup
echo -e "${BLUE}Setting up environment variables...${NC}"

if [ ! -f "app/sentinel-api/.env" ]; then
    echo -e "${YELLOW}Creating app/sentinel-api/.env from example...${NC}"
    cp app/sentinel-api/.env.example app/sentinel-api/.env
    echo -e "${YELLOW}IMPORTANT: Please update app/sentinel-api/.env with your actual Supabase credentials.${NC}"
fi

if [ ! -f "app/sentinel-web/.env.local" ]; then
    echo -e "${YELLOW}Creating app/sentinel-web/.env.local from example...${NC}"
    cp app/sentinel-web/.env.example app/sentinel-web/.env.local
    echo -e "${YELLOW}IMPORTANT: Please update app/sentinel-web/.env.local with your actual Supabase credentials.${NC}"
fi

# 4. Generate Prisma Client
echo -e "${BLUE}Generating Prisma Client...${NC}"
cd app/sentinel-api
if [ -f "prisma/schema.prisma" ]; then
    # Ensure prisma generate runs (it's in postinstall, but good to be explicit for setup)
    pnpm prisma generate
else
    echo "Warning: prisma/schema.prisma not found."
fi
cd ../..

echo -e "${GREEN}Setup complete!${NC}"
echo -e "Next steps:"
echo -e "1. Fill in the variables in ${YELLOW}app/sentinel-api/.env${NC} and ${YELLOW}app/sentinel-web/.env.local${NC}"
echo -e "2. Run ${BLUE}pnpm dev${NC} to start the development server."
