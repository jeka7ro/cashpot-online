# 🚀 CASHPOT ERP - Deployment Guide

## 📋 Overview
This guide covers deploying the CASHPOT ERP system to production using:
- **Backend**: Render (Node.js + PostgreSQL)
- **Frontend**: Vercel (React + Vite)
- **Storage**: AWS S3 (for file uploads)

## 🗄️ Database Setup (PostgreSQL)

### Option 1: Render PostgreSQL
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Create new PostgreSQL database
3. Copy connection string
4. Set as `DATABASE_URL` in backend environment

### Option 2: AWS RDS
1. Create RDS PostgreSQL instance
2. Configure security groups
3. Get connection string
4. Set as `DATABASE_URL` in backend environment

## 🔧 Backend Deployment (Render)

### 1. Prepare Backend
```bash
cd backend
npm install
```

### 2. Environment Variables
Set these in Render dashboard:
```
DATABASE_URL=postgresql://user:pass@host:port/db
NODE_ENV=production
PORT=10000
JWT_SECRET=your-super-secret-jwt-key
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-s3-bucket
CORS_ORIGIN=https://your-frontend.vercel.app
```

### 3. Deploy to Render
1. Connect GitHub repository
2. Select `backend` folder as root
3. Build command: `npm install`
4. Start command: `npm start`
5. Deploy!

## 🎨 Frontend Deployment (Vercel)

### 1. Prepare Frontend
```bash
npm install
npm run build
```

### 2. Environment Variables
Set in Vercel dashboard:
```
VITE_API_URL=https://your-backend.onrender.com
```

### 3. Deploy to Vercel
1. Connect GitHub repository
2. Root directory: `/` (project root)
3. Build command: `npm run build`
4. Output directory: `dist`
5. Deploy!

## ☁️ AWS S3 Setup

### 1. Create S3 Bucket
1. Go to AWS S3 Console
2. Create bucket: `cashpot-uploads`
3. Enable public read access for uploaded files
4. Configure CORS policy

### 2. CORS Configuration
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["https://your-frontend.vercel.app"],
    "ExposeHeaders": []
  }
]
```

### 3. IAM User
1. Create IAM user with S3 permissions
2. Attach policy: `AmazonS3FullAccess`
3. Generate access keys
4. Use in backend environment variables

## 🔐 Security Configuration

### 1. JWT Secret
Generate strong JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 2. Database Security
- Use strong passwords
- Enable SSL connections
- Restrict IP access if possible

### 3. CORS Configuration
- Set specific origins (not wildcard)
- Configure for production domains only

## 📊 Monitoring & Logs

### 1. Render Monitoring
- View logs in Render dashboard
- Set up alerts for errors
- Monitor performance metrics

### 2. Vercel Analytics
- Enable Vercel Analytics
- Monitor frontend performance
- Track user interactions

### 3. AWS CloudWatch
- Monitor S3 usage
- Set up billing alerts
- Track API calls

## 🚨 Troubleshooting

### Common Issues

#### Backend won't start
- Check environment variables
- Verify database connection
- Check logs for errors

#### Frontend build fails
- Check Node.js version (18+)
- Verify all dependencies installed
- Check for TypeScript errors

#### File uploads not working
- Verify AWS credentials
- Check S3 bucket permissions
- Verify CORS configuration

#### Database connection issues
- Check connection string format
- Verify database is running
- Check network connectivity

## 📈 Performance Optimization

### 1. Database
- Add indexes for frequently queried columns
- Use connection pooling
- Optimize queries

### 2. Frontend
- Enable code splitting
- Optimize images
- Use CDN for static assets

### 3. Backend
- Enable compression
- Use caching headers
- Optimize API responses

## 🔄 Updates & Maintenance

### 1. Backend Updates
1. Push changes to GitHub
2. Render auto-deploys
3. Monitor deployment logs

### 2. Frontend Updates
1. Push changes to GitHub
2. Vercel auto-deploys
3. Test in production

### 3. Database Migrations
1. Update schema in code
2. Deploy backend
3. Run migration scripts

## 📞 Support

For deployment issues:
1. Check logs first
2. Verify environment variables
3. Test locally with production config
4. Contact support if needed

---

**🎉 Your CASHPOT ERP system is now live and ready for production use!**













