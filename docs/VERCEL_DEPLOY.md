# 🚀 Hướng dẫn Deploy lên Vercel

## 📋 Tổng quan

**Không cần Prisma** vì đã sử dụng Supabase (có PostgreSQL client sẵn). Supabase cung cấp:

- PostgreSQL database
- Storage cho images
- Real-time subscriptions
- Row Level Security (RLS)

## 🎯 Các bước Deploy

### Bước 1: Chuẩn bị Code

1. **Đảm bảo code đã commit và push lên GitHub/GitLab/Bitbucket**

   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Kiểm tra build local** (tùy chọn nhưng khuyến nghị):
   ```bash
   pnpm build
   ```

### Bước 2: Tạo Vercel Project

1. **Đăng nhập Vercel**: [vercel.com](https://vercel.com)

   - Đăng nhập bằng GitHub/GitLab/Bitbucket

2. **Import Project**:

   - Click "Add New..." → "Project"
   - Chọn repository của bạn
   - Vercel sẽ tự động detect Next.js

3. **Cấu hình Project**:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `./` (hoặc để mặc định)
   - **Build Command**: `pnpm build` (hoặc `npm run build`)
   - **Output Directory**: `.next` (auto)
   - **Install Command**: `pnpm install` (hoặc `npm install`)

### Bước 3: Cấu hình Environment Variables

Trong Vercel Dashboard → Project Settings → Environment Variables, thêm:

#### **Bắt buộc (Supabase)**:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

#### **Tùy chọn (WorldTides)**:

```
WORLDTIDES_KEY=your_worldtides_key_here
```

**Lưu ý**:

- Thêm cho cả 3 environments: Production, Preview, Development
- `NEXT_PUBLIC_*` variables sẽ được expose ra client-side
- `SUPABASE_SERVICE_ROLE_KEY` chỉ dùng server-side (không có `NEXT_PUBLIC_`)

### Bước 4: Deploy

1. **Click "Deploy"**

   - Vercel sẽ tự động:
     - Install dependencies
     - Build project
     - Deploy

2. **Chờ build hoàn thành** (thường 2-5 phút)

3. **Kiểm tra deployment**:
   - Xem logs nếu có lỗi
   - Test URL được cung cấp (ví dụ: `your-project.vercel.app`)

### Bước 5: Setup Custom Domain (Tùy chọn)

1. Vào Project Settings → Domains
2. Thêm domain của bạn
3. Follow DNS instructions

## 🔧 Troubleshooting

### Lỗi Build

**Lỗi**: `Module not found` hoặc `Cannot find module`

- **Giải pháp**: Kiểm tra `package.json` có đầy đủ dependencies

**Lỗi**: `Environment variable not found`

- **Giải pháp**: Kiểm tra đã thêm env vars trong Vercel Dashboard

**Lỗi**: `Supabase connection failed`

- **Giải pháp**:
  - Kiểm tra `NEXT_PUBLIC_SUPABASE_URL` và keys đúng chưa
  - Kiểm tra Supabase project đang active
  - Kiểm tra RLS policies trong Supabase

### Lỗi Runtime

**Lỗi**: `Failed to fetch SOS reports`

- **Giải pháp**:
  - Kiểm tra Supabase table đã tạo chưa
  - Kiểm tra RLS policies cho phép public read

**Lỗi**: `Image upload failed`

- **Giải pháp**:
  - Kiểm tra Storage bucket `sos-images` đã tạo chưa
  - Kiểm tra Storage policies cho phép public upload

## 📝 Checklist trước khi Deploy

- [ ] Code đã push lên Git repository
- [ ] Build thành công local (`pnpm build`)
- [ ] Supabase project đã setup
- [ ] SQL migrations đã chạy trong Supabase
- [ ] Storage bucket `sos-images` đã tạo
- [ ] Environment variables đã thêm vào Vercel
- [ ] Test local với env vars từ Vercel

## 🎉 Sau khi Deploy

1. **Test các tính năng**:

   - Submit SOS report
   - Upload image
   - Xem SOS reports trên map
   - Filter SOS reports

2. **Monitor**:

   - Vercel Dashboard → Analytics
   - Supabase Dashboard → Database → Logs

3. **Optimize** (nếu cần):
   - Enable Vercel Analytics
   - Setup Vercel Speed Insights
   - Configure caching headers

## 🔐 Security Notes

- ✅ `SUPABASE_SERVICE_ROLE_KEY` chỉ dùng server-side (không có `NEXT_PUBLIC_`)
- ✅ RLS policies trong Supabase bảo vệ data
- ✅ Environment variables không được expose trong client bundle
- ⚠️ `NEXT_PUBLIC_SUPABASE_ANON_KEY` là public, nhưng có RLS protection

## 📚 Tài liệu tham khảo

- [Vercel Deployment Guide](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
