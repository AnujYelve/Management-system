# Multi-Store Library Management Marketplace

A complete, production-ready library management system built with Next.js 14 App Router, MongoDB, and JWT authentication. This system allows multiple stores to manage their book inventory, users to browse and issue books, and admins to oversee the entire platform.

## 🚀 Features

### Admin Features
- View all users and stores
- Block/unblock users or stores
- View all issued books and overdue records
- Dashboard with statistics

### Store Features
- Register and manage store information
- Add, update, and delete books
- Manage book availability
- Confirm book issues and returns
- View all issue requests
- Trigger manual notifications

### User Features
- Browse and search books across all stores
- Filter books by store and category
- Check store open status and book availability
- Issue books (requires store confirmation)
- View personal issue history
- Real-time notifications dashboard (in-app + email)
- Automatic notifications for:
  - Book issue confirmations (in-app + email)
  - Reminders (5 days before due date) (in-app + email)
  - Overdue fines (₹5/day, notifications every 10 days) (in-app + email)

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs
- **Scheduled Jobs**: node-cron
- **Email Notifications**: Nodemailer
- **Styling**: Tailwind CSS
- **Authorization**: Role-based access control (ADMIN, STORE, USER)

## 📁 Project Structure

```
/library-management-system
 ├── app
 │   ├── api
 │   │   ├── auth          # Authentication routes
 │   │   ├── admin         # Admin operations
 │   │   ├── store         # Store operations
 │   │   ├── user          # User operations
 │   │   ├── books         # Book browsing
 │   │   ├── notifications # Notification management
 │   │   └── cron          # Cron job trigger
 │   ├── admin             # Admin dashboard
 │   ├── store             # Store dashboard
 │   ├── user              # User dashboard
 │   ├── login             # Login pages
 │   ├── register          # Registration pages
 │   └── page.js           # Landing page
 ├── lib
 │   ├── db.js             # Database connection
 │   ├── auth.js           # Authentication utilities
 │   ├── cron.js           # Cron job logic
 │   ├── email.js          # Email notification utility
 │   └── cloudinary.js     # Cloudinary image upload utility
 ├── utils
 │   └── parseFormData.js  # Form data parsing utility
 ├── models                # Mongoose models
 ├── middleware            # Authentication middleware
 ├── utils                 # Utility functions
 ├── seed                  # Database seeding script
 └── README.md
```

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd library-management-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   MONGODB_URI=mongodb://localhost:27017/library-management
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   NODE_ENV=development

   # Email Configuration (Optional - for email notifications)
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   EMAIL_FROM=your-email@gmail.com

   # Cloudinary Configuration (Required - for image uploads)
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   ```
   
   **Note**: Email notifications are optional. If email configuration is not provided, the system will continue to work with in-app notifications only.

4. **Set up MongoDB**
   - Make sure MongoDB is running on your system
   - Update `MONGODB_URI` in `.env.local` if using a remote MongoDB instance

5. **Seed the database**
   ```bash
   npm run seed
   ```
   This will create:
   - 1 Admin user
   - 2 Store owners with their stores
   - 8 Books (4 per store)
   - 1 Test user

6. **Run the development server**
   ```bash
   npm run dev
   ```

7. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔐 Default Login Credentials

After seeding, you can use these credentials:

### Admin
- **Email**: admin@library.com
- **Username**: admin
- **Password**: admin123

### Store Owner 1
- **Email**: store1@library.com
- **Username**: storeowner1
- **Password**: store123

### Store Owner 2
- **Email**: store2@library.com
- **Username**: storeowner2
- **Password**: store123

### Test User
- **Email**: user@library.com
- **Username**: testuser
- **Password**: user123

## 🔄 Cron Job System

The system includes an automatic notification system powered by `node-cron`:

### Notification Rules

1. **On Book Issue** (when store confirms):
   - Message: "You issued 'BOOK_NAME' from STORE_NAME on DATE. Return before DUE_DATE."

2. **5 Days Before Due Date**:
   - Message: "Reminder: Return 'BOOK_NAME' within 5 days."

3. **After Due Date**:
   - Fine calculation: ₹5 per day
   - Notification every 10 days: "Your book is overdue. Current fine: ₹XXXX"

### Cron Job Implementation

- **Location**: `/lib/cron.js`
- **Schedule**: Runs daily at 9:00 AM
- **Manual Trigger**: `GET /api/cron` or `POST /api/cron`
- **Initialization**: Automatically initialized when the server starts

### How It Works

1. The cron job runs daily and checks all issued books
2. It calculates fines for overdue books
3. It sends reminders 5 days before due date
4. It sends fine notifications every 10 days for overdue books
5. All notifications are stored in the database and visible in the user dashboard
6. **Email notifications are sent in parallel** (if email configuration is provided)

## 🖼️ Image Upload & Display System

The system uses **Cloudinary** (free tier) for image hosting, keeping MongoDB free-tier friendly by storing only image URLs.

### How Image Upload Works

1. **Image Hosting**: Images are uploaded to Cloudinary, not stored in MongoDB
2. **URL Storage**: Only the Cloudinary image URL is stored in MongoDB (lightweight strings)
3. **Supported Images**:
   - **Store Images**: Store logo/photo (optional)
   - **Book Cover Images**: Book cover images (optional)

### Image Upload Features

- **File Types**: JPEG, JPG, PNG, WebP
- **File Size Limit**: Maximum 5MB per image
- **Automatic Optimization**: Cloudinary automatically optimizes images
- **Fallback Handling**: Placeholder images shown if upload fails or image missing

### Cloudinary Setup

1. **Create Free Account**:
   - Go to [cloudinary.com](https://cloudinary.com)
   - Sign up for a free account (25GB storage, 25GB bandwidth/month)

2. **Get Credentials**:
   - Go to Dashboard
   - Copy your:
     - Cloud Name
     - API Key
     - API Secret

3. **Add to Environment Variables**:
   ```env
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   ```

### Image Display

- **Store Dashboard**: Shows store image if uploaded
- **Book Cards**: Display book cover images in both store and user dashboards
- **Fallback**: Gray placeholder shown if no image is available

### MongoDB Free-Tier Friendly

- ✅ Images stored in Cloudinary (not MongoDB)
- ✅ Only URLs stored in database (lightweight strings)
- ✅ No database bloat
- ✅ Scalable architecture

## 📧 Email Notification System

The system supports **dual notification delivery**: both in-app notifications (stored in database) and email notifications (sent via SMTP).

### How Email Notifications Work

1. **Parallel Delivery**: When a notification is created, the system:
   - Creates an in-app notification (stored in database)
   - Sends an email notification (if email configuration is provided)

2. **Email Events**: Emails are sent for the same events as in-app notifications:
   - **Book Issue Confirmation**: When a store confirms a book issue
   - **5-Day Reminder**: 5 days before the book's due date
   - **Overdue Fine Notice**: Every 10 days for overdue books

3. **Email Content**: Email messages match the in-app notification content but are formatted as HTML emails with:
   - Professional styling
   - Color-coded headers (Blue for issues, Amber for reminders, Red for fines)
   - Clear, readable format

### Email Configuration

To enable email notifications, add the following to your `.env.local`:

```env
EMAIL_HOST=smtp.gmail.com        # SMTP server host
EMAIL_PORT=587                   # SMTP port (587 for TLS, 465 for SSL)
EMAIL_USER=your-email@gmail.com  # Your email address
EMAIL_PASS=your-app-password     # Your email password or app password
EMAIL_FROM=your-email@gmail.com  # From address (usually same as EMAIL_USER)
```

### Gmail Setup Example

For Gmail, you'll need to:
1. Enable 2-factor authentication
2. Generate an "App Password" (not your regular password)
3. Use the app password in `EMAIL_PASS`

**Steps**:
1. Go to Google Account settings
2. Security → 2-Step Verification → App passwords
3. Generate a new app password for "Mail"
4. Use this password in `EMAIL_PASS`

### Email Failure Handling

- **Graceful Degradation**: If email sending fails, the system continues to work normally
- **In-app notifications always work**: Even if email fails, users still receive in-app notifications
- **Error Logging**: Email errors are logged but don't break the main application flow
- **Optional Feature**: Email notifications are completely optional - the system works fine without them

### Email Templates

The system uses HTML email templates with:
- **Subject Lines**:
  - "Book Issued Confirmation" for issue confirmations
  - "Book Return Reminder" for 5-day reminders
  - "Book Overdue Notice" for fine notifications
- **HTML Formatting**: Professional, responsive email design
- **Color Coding**: Visual indicators for different notification types

## 📡 API Routes

### Authentication
- `POST /api/auth/admin/login` - Admin login
- `POST /api/auth/store/register` - Store registration
- `POST /api/auth/store/login` - Store login
- `POST /api/auth/user/register` - User registration
- `POST /api/auth/user/login` - User login
- `POST /api/auth/logout` - Logout

### Admin Routes
- `GET /api/admin/users` - Get all users
- `PATCH /api/admin/users` - Block/unblock user
- `GET /api/admin/stores` - Get all stores
- `PATCH /api/admin/stores` - Block/unblock store
- `GET /api/admin/issues` - Get all issues

### Store Routes
- `POST /api/store/register` - Register store
- `GET /api/store/my-store` - Get store info
- `PATCH /api/store/my-store` - Update store
- `GET /api/store/books` - Get store books
- `POST /api/store/books` - Add book
- `PATCH /api/store/books/[id]` - Update book
- `DELETE /api/store/books/[id]` - Delete book
- `GET /api/store/issues` - Get store issues
- `POST /api/store/issues/[id]/confirm` - Confirm issue/return
- `POST /api/store/notifications/trigger` - Send manual notification

### User Routes
- `GET /api/user/stores` - Browse stores
- `GET /api/user/books` - Browse books
- `POST /api/user/books/issue` - Request book issue
- `GET /api/user/my-issues` - Get user's issues

### Notifications
- `GET /api/notifications` - Get user notifications
- `PATCH /api/notifications` - Mark notification as read
- `PUT /api/notifications` - Mark all as read

### Cron
- `GET /api/cron` - Manually trigger cron job
- `POST /api/cron` - Manually trigger cron job

## 🎨 Frontend Pages

### Public Pages
- `/` - Landing page
- `/user/login` - User login
- `/user/register` - User registration
- `/store/login` - Store login
- `/store/register` - Store registration
- `/admin/login` - Admin login

### Protected Pages
- `/user/dashboard` - User dashboard (browse books, view notifications)
- `/store/dashboard` - Store dashboard (manage books, confirm issues)
- `/admin/dashboard` - Admin dashboard (manage users, stores, view issues)

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcryptjs
- Role-based access control
- Protected API routes
- Secure cookie handling
- Input validation

## 🚢 Deployment

### Deploy to Vercel

1. **Push your code to GitHub**

2. **Import project to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository

3. **Add Environment Variables**
   - `MONGODB_URI` - Your MongoDB connection string (use MongoDB Atlas for production)
   - `JWT_SECRET` - A strong secret key
   - `NODE_ENV` - Set to `production`
   - `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM` - (Optional) For email notifications

4. **Deploy**
   - Vercel will automatically deploy your app
   - The cron job will run on Vercel's serverless functions

### MongoDB Atlas Setup

1. Create a free account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster
3. Get your connection string
4. Update `MONGODB_URI` in Vercel environment variables

## 📝 Future Improvements

- [x] Email notifications ✅ (Implemented)
- [ ] Book reviews and ratings
- [ ] Advanced search filters
- [ ] Book reservation system
- [ ] Payment integration for fines
- [ ] Mobile app
- [ ] Real-time chat support
- [ ] Analytics dashboard
- [ ] Export reports (PDF/Excel)
- [ ] Multi-language support

## 🐛 Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running
- Check `MONGODB_URI` in `.env.local`
- Verify network connectivity

### Authentication Issues
- Clear browser cookies
- Check JWT_SECRET is set
- Verify token expiration

### Cron Job Not Running
- Check server logs
- Manually trigger via `/api/cron`
- Verify node-cron is installed

### Email Notifications Not Sending
- Verify all email environment variables are set in `.env.local`
- Check email credentials are correct
- For Gmail, ensure you're using an App Password (not regular password)
- Check server logs for email error messages
- **Note**: Email failures don't break the app - in-app notifications still work
- Test email configuration by checking logs when a notification is created

## 📄 License

This project is created for educational purposes as a college minor project.

## 👨‍💻 Author

Built as a complete, production-ready library management system for college minor project submission.

---

**Note**: This is a complete implementation with no placeholder code. All features are fully functional and ready for deployment.

