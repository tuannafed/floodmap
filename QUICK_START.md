# 🚀 Quick Start - Test Supabase Local

## ⚠️ Lỗi hiện tại: "Invalid API key"

Có vẻ như Supabase keys trong `.env.local` chưa đúng. Hãy làm theo các bước sau:

## 📝 Bước 1: Lấy Supabase Keys

1. **Mở Supabase Dashboard**: [app.supabase.com](https://app.supabase.com)

2. **Chọn project** của bạn (hoặc tạo mới nếu chưa có)

3. **Vào Settings → API**:
   - **Project URL**: Copy URL (ví dụ: `https://xxxxx.supabase.co`)
   - **anon public** key: Copy key bắt đầu bằng `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **service_role** key: Copy key (⚠️ giữ bí mật, chỉ dùng server-side)

## 📝 Bước 2: Cập nhật `.env.local`

Mở file `.env.local` và thay thế bằng keys thực:

```env
# Thay xxxxx bằng URL thực từ Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co

# Thay your_actual_anon_key bằng anon key thực
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Thay your_actual_service_role_key bằng service role key thực
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# WorldTides (optional)
WORLDTIDES_KEY=your_worldtides_key_here
```

**Lưu ý**: 
- Keys phải là chuỗi dài bắt đầu bằng `eyJ...`
- Không có khoảng trắng hoặc dấu ngoặc kép thừa
- `NEXT_PUBLIC_*` sẽ được expose ra client-side

## 📝 Bước 3: Chạy SQL Migrations

1. **Mở Supabase Dashboard → SQL Editor**

2. **Chọn một trong hai cách**:

   **Option A: Với PostGIS (khuyến nghị nếu có)**:
   - Copy nội dung `supabase/migrations/001_create_sos_reports.sql` và chạy
   - Migration này sẽ tự động enable PostGIS extension

   **Option B: Không PostGIS (đơn giản hơn)**:
   - Nếu gặp lỗi PostGIS, dùng file `supabase/migrations/001_create_sos_reports_simple.sql`
   - Copy nội dung và chạy (không cần PostGIS extension)

3. **Chạy migration 2**: Copy nội dung `supabase/migrations/002_create_storage_bucket.sql` và chạy

**Lưu ý**: Nếu gặp lỗi `function st_makepoint does not exist`, hãy dùng Option B (simple migration).

## 📝 Bước 4: Tạo Storage Bucket

1. **Mở Supabase Dashboard → Storage**

2. **Click "New bucket"**

3. **Điền thông tin**:
   - Name: `sos-images`
   - Public bucket: ✅ (bật)
   - Click "Create"

## 🧪 Bước 5: Test

```bash
# Test Supabase connection
pnpm test:supabase

# Nếu test thành công, start dev server
pnpm dev

# Mở browser: http://localhost:3000
```

## ✅ Khi nào thành công?

- ✅ `pnpm test:supabase` không có lỗi
- ✅ Có thể submit SOS report từ UI
- ✅ SOS reports hiển thị trên map
- ✅ Image upload thành công

## 🔍 Troubleshooting

### Lỗi: "Invalid API key"
→ Kiểm tra lại keys trong `.env.local` có đúng không

### Lỗi: "relation does not exist"
→ Chưa chạy SQL migrations

### Lỗi: "Storage bucket not found"
→ Chưa tạo bucket `sos-images`

### Lỗi: "Failed to fetch"
→ Kiểm tra Supabase project có đang active không

## 📚 Tài liệu tham khảo

- [Supabase Getting Started](https://supabase.com/docs/guides/getting-started)
- [Supabase API Keys](https://supabase.com/docs/guides/api/api-keys)
- [TESTING.md](./TESTING.md) - Hướng dẫn test chi tiết

