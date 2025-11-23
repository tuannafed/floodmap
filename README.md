# 🌊 FloodMap v1 - Bản Đồ Ngập Lụt Realtime

Ứng dụng web hiển thị bản đồ ngập lụt realtime và dự báo ngắn hạn cho các tỉnh Việt Nam với cập nhật mỗi 5 phút.

## ✨ Tính năng

- 🗺️ Bản đồ tương tác với MapLibre GL JS (react-map-gl)
- 🌧️ Radar mưa realtime từ RainViewer
- 📊 Dự báo mưa 15 phút từ Open-Meteo
- 🌊 Dữ liệu triều biển từ WorldTides
- ⚠️ Cảnh báo nguy cơ ngập tự động
- 🔍 Tìm kiếm tỉnh/thành phố
- 📱 Responsive design với dark mode support
- ⚡ Next.js 16 + React 19 + Tailwind CSS v4

## 🚀 Cài đặt

### Yêu cầu

- Node.js 18+ 
- pnpm 9 (hoặc npm/yarn)

### Bước 1: Cài đặt dependencies

```bash
pnpm install
```

### Bước 2: Setup Supabase (Database)

1. **Tạo tài khoản Supabase miễn phí**: [supabase.com](https://supabase.com)

2. **Tạo project mới** và lấy credentials:
   - Project URL (ví dụ: `https://xxxxx.supabase.co`)
   - Anon/Public Key (trong Settings > API)
   - Service Role Key (trong Settings > API, chỉ dùng server-side)

3. **Chạy SQL migrations**:
   - Mở SQL Editor trong Supabase Dashboard
   - Chạy file `supabase/migrations/001_create_sos_reports.sql`
   - Chạy file `supabase/migrations/002_create_storage_bucket.sql`

4. **Tạo Storage Bucket** (nếu chưa tự động tạo):
   - Vào Storage trong Dashboard
   - Tạo bucket mới tên `sos-images`
   - Set public: `true`

### Bước 3: Cấu hình Environment Variables

Tạo file `.env.local` trong thư mục gốc:

**Lưu ý**: Mapbox Streets style cần Mapbox access token. Bạn có thể:
- Lấy token miễn phí tại [mapbox.com](https://account.mapbox.com/access-tokens/)
- Hoặc thay đổi style sang free alternatives (Stadia Maps, Carto) trong code

```bash
touch .env.local
```

Thêm các biến môi trường sau vào `.env.local`:

```env
# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# WorldTides API Key (Tùy chọn)
# Lấy key miễn phí tại: https://www.worldtides.info/apidocs
WORLDTIDES_KEY=your_worldtides_api_key_here
```

> **Lưu ý**: 
> - Supabase credentials là **bắt buộc** để lưu trữ SOS reports.
> - `WORLDTIDES_KEY` là tùy chọn. Nếu không có key, ứng dụng vẫn hoạt động nhưng sẽ không hiển thị dữ liệu triều biển.
> - Các API khác (RainViewer, Open-Meteo, Nominatim) đều miễn phí và không cần key.
> - File `.env.local` đã được thêm vào `.gitignore` để bảo mật.

### Bước 3: Chạy ứng dụng

```bash
pnpm dev
```

Mở trình duyệt tại [http://localhost:3000](http://localhost:3000)

## 📁 Cấu trúc dự án

```
floodmap/
├── app/
│   ├── page.tsx              # Trang chủ với form tìm kiếm
│   ├── layout.tsx            # Root layout
│   ├── globals.css           # Global styles với Tailwind v4
│   └── api/
│       ├── geocode/route.ts  # API route cho Nominatim
│       ├── rainviewer/route.ts # API route cho RainViewer
│       └── tides/route.ts    # API route cho WorldTides
├── components/
│   └── FloodMap.tsx          # Component bản đồ chính
├── lib/
│   └── datasources.ts        # Các hàm gọi API
└── public/                   # Static files
```

## 🔌 APIs sử dụng

- **Nominatim** (OpenStreetMap): Geocoding - chuyển đổi tên địa điểm thành tọa độ
- **RainViewer**: Radar mưa realtime
- **Open-Meteo**: Dự báo mưa 15 phút (minutely_15)
- **WorldTides**: Dữ liệu triều biển (cần API key)

Tất cả APIs đều miễn phí (trừ WorldTides cần đăng ký để có key).

## 🎯 Cách sử dụng

1. Nhập tên tỉnh/thành phố vào ô tìm kiếm (VD: "Đà Nẵng", "Hà Nội", "TP.HCM")
2. Click "Tìm" hoặc nhấn Enter
3. Bản đồ sẽ tự động zoom đến vị trí
4. Xem thông tin:
   - Radar mưa realtime (overlay trên bản đồ)
   - Mưa hiện tại và dự báo 15 phút
   - Mực nước triều (nếu có API key)
   - Cảnh báo nguy cơ ngập (⚠️ hoặc ✅)

## 🔄 Cập nhật dữ liệu

Ứng dụng tự động cập nhật dữ liệu mỗi 5 phút:
- Radar mưa từ RainViewer
- Dự báo mưa từ Open-Meteo
- Dữ liệu triều từ WorldTides

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19
- **Map**: MapLibre GL JS 5.13 + react-map-gl 8.1
- **Styling**: Tailwind CSS v4
- **Type System**: TypeScript 5.6
- **Package Manager**: pnpm 9
- **Build Tools**: PostCSS 9 + Autoprefixer 10

## 📝 Ghi chú

- Ứng dụng mặc định hiển thị Đà Nẵng khi khởi động
- Dữ liệu triều chỉ hiển thị nếu có WorldTides API key
- Radar mưa có độ trễ khoảng 5-10 phút so với thời gian thực
- Bản đồ được giới hạn trong phạm vi Việt Nam và vùng lân cận (bounds: 6.0-25.0°N, 100-112°E)

## 🚀 Deploy lên Vercel

Xem hướng dẫn chi tiết trong [VERCEL_DEPLOY.md](./VERCEL_DEPLOY.md)

**Tóm tắt nhanh**:
1. Push code lên GitHub/GitLab
2. Import project vào Vercel
3. Thêm Environment Variables (Supabase keys)
4. Deploy!

**Lưu ý**: Không cần Prisma vì đã dùng Supabase (có PostgreSQL client sẵn).

## 🔮 Tính năng tương lai

- Overlay DEM (SRTM) để tô vùng thấp (<1.5 m)
- Cảnh báo predictive AI (rain + tide + terrain)
- Socket realtime (khi có dữ liệu sensor)
- Crowdsourced reports (người dân gửi ảnh ngập)

## 📄 License

MIT
