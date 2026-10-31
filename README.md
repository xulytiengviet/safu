# SAFU Monitor · Binance Incident Intelligence

**Tác giả phát triển:** Long Ngo · **Mã nguồn:** MIT · **Ngôn ngữ:** Tiếng Việt

Dashboard độc lập theo dõi sự cố các dòng tài sản xuất phát từ các ví được gắn nhãn Binance ngày 29–30/10/2026.

## Mở website

1. Trong repository, vào **Settings → Pages**.
2. Chọn **Build and deployment → Deploy from a branch → main → /(root) → Save**.
3. Sau khi GitHub Pages xuất bản, truy cập **https://xulytiengviet.github.io/safu/**.

> URL GitHub Pages là đường dẫn dự kiến, chưa xác nhận Pages đã được bật hoặc triển khai thành công.

## Tích hợp WebGIS và đồ thị on-chain

Trang mới: **[webgis.html](./webgis.html)** — URL sau khi bật GitHub Pages: **https://xulytiengviet.github.io/safu/webgis.html**.

- **On-chain network graph**: 10 blockchain từ snapshot hiện hành, liên kết tổng hợp đến `frozen/escrow` và `unresolved`; chọn chain để xem KPI và explorer. Đây là sơ đồ kế toán, **không phải tọa độ hoặc đường đi vật lý của tiền**.
- **WebGIS thế giới**: MapLibre GL JS và một lớp GeoJSON có khả năng mở rộng, với marker và popup nguồn khi có vị trí địa lý được kiểm chứng. Hiện `data/geo-evidence.geojson` **cố ý không có đối tượng**, do chưa có chứng cứ vị trí thực của ví hay kẻ tấn công; ứng dụng không tạo điểm vị trí giả.
- **Timeline UTC**: Bộ lọc sự kiện theo ngày; KPI vẫn là snapshot **30/10/2026** chứ không phải dữ liệu lịch sử tại ngày phát lại.
- **Dữ liệu và quy tắc GIS**: [data/GEO_EVIDENCE.md](./data/GEO_EVIDENCE.md). Bắt buộc nguồn HTTPS, UTC, độ tin cậy, WGS84 lon/lat.
- **Bản đồ nền**: sử dụng demo tiles của MapLibre cho mục đích thử nghiệm; khi triển khai công khai lớn cần cấu hình nhà cung cấp tiles riêng theo quy định bản quyền và tải dịch vụ.

Giao diện hoạt động trực tiếp trên GitHub Pages, không cần backend hay khóa bản đồ trong bản demo. Chưa xác nhận GitHub Pages đã bật và chưa có kiểm thử thực tế trên trình duyệt sản xuất.

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
