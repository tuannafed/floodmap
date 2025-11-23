# 🧪 Hướng dẫn Test Supabase Local

## ✅ Checklist trước khi test

1. **Đã thêm env variables vào `.env.local`**:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key_here
   ```

2. **Đã chạy SQL migrations trong Supabase Dashboard**:
   - `supabase/migrations/001_create_sos_reports.sql`
   - `supabase/migrations/002_create_storage_bucket.sql`

3. **Đã tạo Storage bucket `sos-images`** trong Supabase Dashboard

## 🧪 Cách Test

### Option 1: Test bằng Script (Khuyến nghị)

```bash
# Test Supabase connection
pnpm test:supabase
```

Script sẽ kiểm tra:
- ✅ Environment variables
- ✅ Database connection
- ✅ Table access
- ✅ Insert/Select operations
- ✅ Storage bucket

### Option 2: Test bằng Dev Server

1. **Start dev server**:
   ```bash
   pnpm dev
   ```

2. **Mở browser**: [http://localhost:3000](http://localhost:3000)

3. **Test các tính năng**:
   - Submit SOS report (click nút "🆘 Gửi SOS")
   - Upload image
   - Xem SOS reports trên map
   - Xem SOS list trong sidebar

### Option 3: Test API trực tiếp

```bash
# Test GET endpoint
curl http://localhost:3000/api/sos/report

# Test POST endpoint (từ terminal)
curl -X POST http://localhost:3000/api/sos/report \
  -F "lat=16.0544" \
  -F "lon=108.2022" \
  -F "peopleCount=1" \
  -F "urgency=high" \
  -F "description=Test SOS" \
  -F "hasVulnerable=false"
```

## 🔍 Troubleshooting

### Lỗi: "Invalid API key"

**Nguyên nhân**: API key trong `.env.local` không đúng hoặc chưa được set.

**Giải pháp**:
1. Kiểm tra `.env.local` có đúng format:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
2. Lấy keys từ Supabase Dashboard:
   - Settings → API
   - Copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - Copy **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

### Lỗi: "relation does not exist"

**Nguyên nhân**: Chưa chạy SQL migrations.

**Giải pháp**:
1. Mở Supabase Dashboard → SQL Editor
2. Copy nội dung `supabase/migrations/001_create_sos_reports.sql`
3. Paste và chạy (Run)
4. Lặp lại với `002_create_storage_bucket.sql`

### Lỗi: "Storage bucket not found"

**Nguyên nhân**: Chưa tạo storage bucket.

**Giải pháp**:
1. Mở Supabase Dashboard → Storage
2. Click "New bucket"
3. Tên: `sos-images`
4. Public: `true`
5. Click "Create"

### Lỗi: "Failed to fetch" khi submit SOS

**Nguyên nhân**: Có thể do:
- Supabase connection failed
- RLS policies chưa đúng
- Network issue

**Giải pháp**:
1. Kiểm tra browser console (F12) để xem lỗi chi tiết
2. Kiểm tra Supabase Dashboard → Database → Logs
3. Kiểm tra RLS policies trong Supabase Dashboard → Authentication → Policies

## 📝 Kiểm tra nhanh

```bash
# 1. Kiểm tra env vars (không hiển thị giá trị thực)
cat .env.local | grep SUPABASE | sed 's/=.*/=***/'

# 2. Test Supabase connection
pnpm test:supabase

# 3. Start dev server và test UI
pnpm dev
```

## ✅ Khi nào test thành công?

- ✅ Script `pnpm test:supabase` chạy không lỗi
- ✅ Có thể submit SOS report từ UI
- ✅ SOS reports hiển thị trên map
- ✅ Image upload thành công
- ✅ SOS list hiển thị đúng

## 🚀 Sau khi test thành công

Bạn có thể deploy lên Vercel! Xem [VERCEL_DEPLOY.md](./VERCEL_DEPLOY.md)

