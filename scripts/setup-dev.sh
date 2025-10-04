#!/bin/bash

echo "🚀 Setting up VisionGrade development environment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18 or higher."
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python is not installed. Please install Python 3.8 or higher."
    exit 1
fi

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL is not installed. Please install PostgreSQL 12 or higher."
    echo "   You can also use Docker: docker run --name postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres:15"
fi

echo "📦 Installing dependencies..."

# Install root dependencies
npm install

# Install frontend dependencies
echo "📱 Installing frontend dependencies..."
cd frontend && npm install && cd ..

# Install backend dependencies
echo "🔧 Installing backend dependencies..."
cd backend && npm install && cd ..

# Install ML service dependencies
echo "🤖 Installing ML service dependencies..."
cd ml-service && pip install -r requirements.txt && cd ..

# Copy environment files
echo "⚙️  Setting up environment files..."
if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    echo "✅ Created backend/.env - Please update with your database credentials"
fi

if [ ! -f ml-service/.env ]; then
    cp ml-service/.env.example ml-service/.env
    echo "✅ Created ml-service/.env - Please update with your configuration"
fi

echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update backend/.env with your PostgreSQL credentials"
echo "2. Create the database: createdb visiongrade_db"
echo "3. Start development: npm run dev"
echo ""
echo "Services will be available at:"
echo "- Frontend: http://localhost:3000"
echo "- Backend API: http://localhost:5000"
echo "- ML Service: http://localhost:8000"