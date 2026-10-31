# SAFU Monitor · Binance Incident Intelligence

**Tác giả phát triển:** Long Ngo · **Mã nguồn:** MIT · **Ngôn ngữ:** Tiếng Việt

Dashboard độc lập theo dõi sự cố các dòng tài sản xuất phát từ các ví được gắn nhãn Binance ngày 29–30/10/2026.

## Mở website

1. Trong repository, vào **Settings → Pages**.
2. Chọn **Build and deployment → Deploy from a branch → main → /(root) → Save**.
3. Sau khi GitHub Pages xuất bản, truy cập **https://xulytiengviet.github.io/safu/**.

> URL GitHub Pages là đường dẫn dự kiến, chưa xác nhận Pages đã được bật hoặc triển khai thành công.

## WebGIS v2 · Cung động từ giao dịch có chứng cứ

Đường dẫn [webgis.html](./webgis.html) · URL dự kiến sau khi bật Pages: https://xulytiengviet.github.io/safu/webgis.html

Giao diện WebGIS lấy ý tưởng bố cục, neon màu và hiệu ứng cung Bézier / hạt chuyển động / pháo hoa ở điểm đến từ bản mẫu **QuantBot Global Liquidity Map (Fireworks Edition)** do người dùng cung cấp, nhưng **không kế thừa dữ liệu ngẫu nhiên, các quốc gia, giao dịch hoặc chỉ số 'live' giả lập**.

**Hai chế độ tách bạch:**

1. **Sơ đồ giao dịch ví–ví / blockchain**: 21 nút ví/nhãn nguồn và 14 cạnh chuyển khoản có liên kết explorer, trải trên 9 blockchain. Cạnh được lưu trong [data/wallet-flows.json](./data/wallet-flows.json) kèm token, số lượng, UTC, loại nguồn / chuyển tiếp / escrow, mô tả. Click cung hoặc nút để xem ví nguồn, ví nhận và nguồn xác minh. 10 blockchain đều có KPI từ `data/snapshot.json`, kể cả mạng chưa có đường chuyển cụ thể trong tập trích mẫu. Đồ thị **không hoàn chỉnh toàn bộ giao dịch vụ việc**.
2. **WebGIS địa lý thực**: dùng MapLibre GL JS, lớp dữ liệu [data/geo-evidence.geojson](./data/geo-evidence.geojson) WGS84. Marker chỉ hiện khi có kinh độ/vĩ độ, nguồn HTTPS, thời gian, mức độ tin cậy và diễn giải. Mặc định 0 marker do hiện chưa có tọa độ chứng minh. Địa chỉ ví và quốc gia bị nghi vấn **không phải** bằng chứng địa lý.

**Điều khiển**: bộ lọc 10 chuỗi, tìm kiếm token/hash/địa chỉ, timeline dựa trên 14 giao dịch trích mẫu, phát lại 1×/3×/10×, chọn từng ví/giao dịch, KPI phong tỏa / chưa giải quyết. Tốc độ phát lại chỉ dành cho trực quan và không phải tốc độ giao dịch thực. Giá trị token từng cạnh không cộng xuyên tài sản; ledger tổng dùng phép định giá riêng trong snapshot.

**Tệp triển khai**: `webgis.html`, `assets/safu-webgis.css`, `assets/safu-webgis.js`, `data/wallet-flows.json`, `data/geo-evidence.geojson`, `scripts/validate-webgis.mjs`, `.github/workflows/validate-webgis.yml`.

**Kiểm tra**: `node scripts/validate-webgis.mjs` (Node 22) để xác minh cú pháp, URL nguồn, nút-cạnh, schema GeoJSON và tổng KPI. GitHub Actions dự kiến chạy kiểm tra khi sửa các tệp WebGIS và có thể chạy thủ công. Kiểm tra dữ liệu tĩnh không thay thế kiểm thử trình duyệt với WebGL/đường truyền MapLibre hoặc đối chiếu lại từng biên lai RPC.

**Lưu ý dữ liệu:** Số liệu giao dịch và các nhãn nguồn được trích từ báo cáo và URL công khai mà người dùng cung cấp; repository chỉ cung cấp chứng cứ để người đọc tự đối chiếu, chưa chạy một hệ thống kiểm toán RPC tự động. Không mô phỏng giao dịch không có trong dữ liệu. Nguồn tile MapLibre demo cần thay khi triển khai sản xuất lưu lượng lớn.

## Có gì trong bản đầu tiên?

- `index.html`: giao diện dark mode responsive, 4 KPI, biểu đồ 10 blockchain, bảng nguồn và timeline có bộ lọc.
- `data/snapshot.json`: sổ nguồn gốc định giá và 14 sự kiện có URL bằng chứng, mốc snapshot **2026-10-30 17:42:12 UTC**.
- `scripts/check_sources.py`: ghi nhận khả năng truy cập và SHA-256 của một số nguồn; không tự thay các con số của ledger.
- `.github/workflows/daily-monitor.yml`: workflow vào **01:17 UTC hằng ngày** (08:17 giờ Việt Nam); có thể chạy bằng **Actions → Daily source monitoring → Run workflow**. Dữ liệu đầu ra `data/source-health.json`.
- `LICENSE`: MIT.

## Số liệu gốc, không phải realtime

| Chỉ số | Giá trị USD |
|---|---:|
| Source outflow (ước tính) | 6,291,065,616.20 |
| Issuer frozen + Security Council escrow | 2,838,445,348.48 |
| Unresolved (ước tính) | 3,452,620,267.72 |

**Bảo đảm ≈45,12%, chưa giải quyết ≈54,88%.** Đóng băng/escrow không đồng nghĩa với hoàn trả. Giá trị USD ấn định theo giá lịch sử và cách hạch toán nguồn ban đầu. Biểu đồ không cộng trùng token đã swap/bridge hoặc chuyển tiếp nội bộ.

**Nguồn đối chiếu:** [FUNDSARENOTSAFU](https://fundsarenotsafu.com/) · [Sổ trace](https://fundsarenotsafu.com/trace.md) · [Binance công bố ảnh hưởng và tiền phong tỏa](https://x.com/binance/status/2115993361517891592) · [Binance công bố quỹ dự trữ](https://x.com/binance/status/2116121748555153621). Binance tự báo cáo ≈6,3 tỷ USD ảnh hưởng và ≈3 tỷ USD phong tỏa; quỹ công ty dự trữ >6,34 tỷ USD là một tuyên bố khác, không chứng minh bồi thường đã được thực hiện.

## Giới hạn tự động hóa

Workflow hiện **chỉ giám sát tình trạng truy cập nguồn hằng ngày**, chưa xác minh lại blockchain và chưa tự cập nhật KPI. `index.html` kiểm tra lại `data/snapshot.json` mỗi 5 phút trong khi trang đang mở, nhưng **không tạo số liệu mới nếu snapshot không được cập nhật**. Nên triển khai bộ thu thập EVM RPC/Bitcoin/Solana/XRPL/Tron riêng, kiểm chứng từng giao dịch và chuẩn hóa dữ liệu trước khi thay số liệu công bố.

### Quy trình phê duyệt thay snapshot

1. Thu nhận giao dịch và phát biểu với URL gốc, thời gian UTC, kết quả thành công/thất bại.
2. Đối chiếu nguồn và loại trùng swap/bridge/loan/onward.
3. Tính toán và xác nhận `moved = frozen + unresolved`.
4. So sánh với snapshot cũ, xuất diff và các bằng chứng bổ sung.
5. Duyệt thủ công rồi commit vào `data/snapshot.json`.

Đây là công cụ nghiên cứu thông tin công khai; các đánh giá gán tác nhân hay lỗ hổng ban đầu chưa phải kết luận độc lập.
