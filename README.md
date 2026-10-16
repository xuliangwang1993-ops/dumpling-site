# 三鲜手作 · 手工水饺品牌站

静态站点，可直接部署到任意静态托管（Render / Cloudflare Pages / GitHub Pages）。

## 结构
- `index.html` — 首页：视频互动首屏、菜单、下单流程、物料下载
- `styles.css` — 全站样式（墨绿 / 米白 / 暖橙）
- `app.js` — 菜单渲染、购物车、结算、客户管理（localStorage）
- `assets/` — 品牌图（gpt-image-2 生成）、视频（ffmpeg 由静帧合成）、
  `logo.pdf/png/svg`（VectorCraft 导出）、`menu.pdf`、`spec.pdf`（WordCraft 排版）

## 本地预览
```bash
python3 -m http.server 8000
```

## 后台
页面右下角「管理后台」，或访问 `#admin`。

## Render 部署
已附 `render.yaml`：Render 控制台 → New → Blueprint → 选本仓库。
或手动：New → Static Site，Build Command 留空，Publish Directory 填 `.`
