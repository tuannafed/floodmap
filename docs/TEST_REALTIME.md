# 🧪 Hướng dẫn Test Realtime SOS

## ✅ Test Script đã chạy thành công

Test script cho thấy:
- ✅ **INSERT event**: Hoạt động tốt
- ✅ **UPDATE event**: Hoạt động tốt
- ⚠️ **DELETE event**: Có thể cần enable Realtime trong Supabase Dashboard

## 🧪 Test Manual trong Browser

### Cách 1: Test với 2 Browser Tabs

1. **Mở app ở 2 tabs khác nhau**:
   - Tab 1: `http://localhost:3000`
   - Tab 2: `http://localhost:3000`

2. **Tab 1**: Submit một SOS mới
   - Click nút "🆘 Gửi SOS"
   - Điền form và submit
   - Xem toast notification

3. **Tab 2**: Tự động thấy SOS mới xuất hiện
   - Không cần refresh
   - Marker mới xuất hiện trên map
   - Toast notification hiển thị
   - SOS list tự động cập nhật

### Cách 2: Test với Supabase Dashboard

1. **Mở app**: `http://localhost:3000`
2. **Mở Supabase Dashboard**:
   - Vào Table Editor → `sos_reports`
   - Tìm một SOS report
3. **Update status**:
   - Thay đổi `status` từ `new` → `processing`
   - Hoặc `processing` → `rescued`
4. **App tự động cập nhật**:
   - Marker màu thay đổi trên map
   - Toast notification hiển thị
   - SOS list tự động refresh

### Cách 3: Test với Browser Console

1. **Mở Browser Console** (F12)
2. **Xem Realtime logs**:
   ```
   🔴 Realtime SOS subscription status: SUBSCRIBED
   🔴 Realtime SOS event: INSERT {...}
   🔴 Realtime SOS event: UPDATE {...}
   ```

3. **Submit SOS** và xem logs:
   - `🆕 New SOS report received: {...}`
   - `🔄 SOS report updated: {...}`

## 🔍 Kiểm tra Realtime Status

### Trong Browser Console

Mở Console và kiểm tra:
```javascript
// Kiểm tra subscription status
// Logs sẽ hiển thị:
// 🔴 Realtime SOS subscription status: SUBSCRIBED
```

### Trong Network Tab

1. Mở DevTools → Network
2. Filter: `realtime`
3. Xem WebSocket connections:
   - `wss://[project].supabase.co/realtime/v1/websocket`
   - Status: 101 Switching Protocols

## ⚙️ Enable Realtime trong Supabase (nếu chưa enable)

1. **Mở Supabase Dashboard**
2. **Vào Database → Replication**
3. **Tìm table `sos_reports`**
4. **Enable Realtime** cho table này
5. **Save changes**

## 🐛 Troubleshooting

### Realtime không hoạt động

**Kiểm tra**:
1. ✅ Supabase credentials trong `.env.local`
2. ✅ Realtime enabled trong Supabase Dashboard
3. ✅ RLS policies cho phép SELECT (cần cho Realtime)
4. ✅ Browser console không có errors

**Logs để kiểm tra**:
- `🔴 Realtime SOS subscription status: SUBSCRIBED` ✅
- `🔴 Realtime SOS event: INSERT` ✅
- `🔴 Realtime SOS event: UPDATE` ✅

### DELETE event không hoạt động

DELETE event có thể không được trigger nếu:
- Realtime chưa enable cho DELETE operations
- RLS policies không cho phép DELETE

**Giải pháp**: DELETE không quan trọng bằng INSERT/UPDATE. Nếu cần, có thể enable trong Supabase Dashboard.

## 📊 Test Results

### ✅ Đã test thành công:
- [x] Realtime subscription
- [x] INSERT event
- [x] UPDATE event
- [x] Auto-update map markers
- [x] Auto-update SOS list
- [x] Toast notifications

### ⚠️ Cần kiểm tra:
- [ ] DELETE event (có thể cần enable trong Supabase)

## 🎯 Expected Behavior

Khi có SOS mới:
1. ✅ Marker xuất hiện trên map ngay lập tức
2. ✅ SOS list tự động cập nhật
3. ✅ Toast notification hiển thị
4. ✅ Không cần refresh page

Khi SOS được update:
1. ✅ Marker màu thay đổi (red → orange → green)
2. ✅ SOS list tự động refresh
3. ✅ Toast notification hiển thị
4. ✅ Sort order tự động cập nhật

