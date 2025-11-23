# 🌊 FloodMap v1 - Bản Đồ Ngập Lụt Realtime

Ứng dụng web hiển thị bản đồ ngập lụt realtime và dự báo ngắn hạn cho các tỉnh Việt Nam với cập nhật mỗi 5 phút.

## ✨ Tính năng

- 🗺️ Bản đồ tương tác với Leaflet (React-Leaflet v5)
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

### Bước 2: Cấu hình API Key (Tùy chọn)

Tạo file `.env.local`:

```bash
cp .env.local.example .env.local
```

Thêm WorldTides API key vào `.env.local`:

```
WORLDTIDES_KEY=your_worldtides_key_here
```

> **Lưu ý**: WorldTides API key là tùy chọn. Nếu không có key, ứng dụng vẫn hoạt động nhưng sẽ không hiển thị dữ liệu triều biển. Bạn có thể lấy key miễn phí tại [worldtides.info](https://www.worldtides.info/).

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
- **Map**: Leaflet 1.9 + React-Leaflet 5
- **Styling**: Tailwind CSS v4
- **Type System**: TypeScript 5.6
- **Package Manager**: pnpm 9
- **Build Tools**: PostCSS 9 + Autoprefixer 10

## 📝 Ghi chú

- Ứng dụng mặc định hiển thị Đà Nẵng khi khởi động
- Dữ liệu triều chỉ hiển thị nếu có WorldTides API key
- Radar mưa có độ trễ khoảng 5-10 phút so với thời gian thực
- Bản đồ được giới hạn trong phạm vi Việt Nam (bounds: 7.5-23.5°N, 102-110°E)

## 🔮 Tính năng tương lai

- Overlay DEM (SRTM) để tô vùng thấp (<1.5 m)
- Cảnh báo predictive AI (rain + tide + terrain)
- Socket realtime (khi có dữ liệu sensor)
- Crowdsourced reports (người dân gửi ảnh ngập)

## 📄 License

MIT
