# Bulk Eat Plan · 项目设计能力与交付记录

更新时间：2026-10-29

## 当前交付

- `index.html`: 无需编译的单页 HTML/CSS/JS；含响应式布局。
- Gym/Rest + Blend/No Blend 四状态，基于模式生成一或两份 Diet Chicken Full Meal。
- 可切换 side、添加预置食物、自定义外食、实时合计 kcal / 蛋白质 / 碳水 / 脂肪，并提供纤维参考。
- 完整 Blend 食材、Full Meal 六种可接受 Side、Set C / E、30 天餐盒预算、浏览器本地晨起体重记录。
- 不含云同步、付款、自动下单、实时餐厅订单与实时价格。

## 已写入的项目设计技能文件

| 名称 | 上游 | 文件路径 | 完整性 / 发现状态 |
|---|---|---|---|
| design-taste-frontend | Leonxlnx/taste-skill (上游 main，2026-10-29 检查) | `.agents/skills/design-taste-frontend/SKILL.md` | SKILL.md 已写入；完整脚本、assets 与 references 未同步，不能视作完整可执行安装。 |
| minimalist-ui | Leonxlnx/taste-skill-classics (上游 main，2026-10-29 检查) | `.agents/skills/minimalist-ui/SKILL.md` | 单文件 skill，已写入；运行时自动发现未实测。 |
| frontend-design | anthropics/skills (上游 main，2026-10-29 检查) | `.agents/skills/frontend-design/SKILL.md` | SKILL.md 已写入；LICENSE 未同步，待补齐。运行时自动发现未实测。 |
| image-to-code | Leonxlnx/imagegen-skills (上游 main，2026-10-29 检查) | `.agents/skills/image-to-code/SKILL.md` | 单文件 skill，已写入；运行时自动发现未实测。 |

## 尚未实际安装的来源

- `gpt-taste`、`high-end-visual-design`、`industrial-brutalist-ui`、`stitch-design-taste`、`design-taste-frontend-v1`: 新旧版本需映射来源；当前产品不使用 brutalist 或旧行为样式，先不重复安装。
- `imagegen-frontend-web`、`imagegen-frontend-mobile`、`brandkit`: 静态界面生成参考不是此 HTML 日常功能的先决条件，未安装。
- `huashu-design`: 仅定位到上游 master；完整 references/assets/scripts/demos 尚未复制，不能声称已安装。
- `agency-agents` 的十个设计角色：上游 Claude 原生 agent 文件不作为 Codex agent 直接复制；未安装或启用。
- `web-artifacts-builder`、`algorithmic-art`：暂不需要复杂 React 构建和 p5.js，未安装。
- `react-artifact-builder`、`visual-art-canvas`、`website-intelligence`：仅有用户本地路径信息，远端环境不可直接访问，未安装。
- `council-rams`：属于 council 插件，未安装。
- `OpenMontage` 的网页参考/Three.js：项目没有 3D 要求，未安装。

## 环境与验证范围

本环境无法从容器 DNS 访问 github.com，故 `npx skills add` 或 git clone 的项目级常规安装没有成功运行；改由 GitHub 连接器读取上游原始 SKILL.md 并写入当前 repo。当前已写入的四个路径可在 GitHub 中查看，但**未验证 Codex/Claude 运行时自动发现**。其中设计主 skill 仍缺完整目录，后续需要在具备网络的本地环境完成安装和工具脚本校验。

本应用直接使用纯 HTML/JS，不依赖未安装的前端框架。GitHub Pages 需要仓库拥有者在 Settings → Pages 选择 Deploy from a branch、main、/(root) 才能发布。

## 数值说明

- 体重目标：49 → 60 kg，身高 167cm。
- 默认日目标：Gym 2500 kcal / Rest 2400 kcal；训练与非训练日碳水、蛋白质目标来自个人饮食计划的起始估算。
- Blend 工作值：1130 kcal、73P、131C、39F、18 fibre；其确切值随 MILO/巧克力/乳清品牌和份量改变。
- Full Meal 六个 side 的整盒热量与 macro 来自此前记录的 Diet Chicken 菜单估算，不能代表实时官方标准。
- 月费用：`(60−当月 Blend 天数)×(RM389÷23)`，仅适用于 30 天及默认一/两盒模式；不包含运费与其他食物。
- 体重由浏览器 localStorage 存储，仅同一浏览器/设备可用。体重历史显示最近七次记录的平均值，并非严格七个日历日移动平均。

## 本版下一步 QA

需要在浏览器中分别测试 360 / 768 / 1440px 宽度、四状态、刷新持久化、数字输入、键盘可访问性，并核实实际商品营养标签和套餐价格后再作为最终量化追踪工具。
