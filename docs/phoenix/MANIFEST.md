# Phoenix artifact manifest

Назначение: контроль полноты и неизменности переданных артефактов.

Снимок сформирован 28 июля 2026 года. SHA-256 рассчитан для содержимого файла,
а не для Git blob.

| Путь относительно `docs/phoenix/` | Размер, байт | SHA-256 |
|---|---:|---|
| `README.md` | 8646 | `524d71adc12f3a27246c4c08fcd5f8b189be84a6b9034edf9808b6907f3a177b` |
| `IMPLEMENTATION-GAP.md` | 6298 | `16d2938be529a2b98048a696c2c4870a84debf2659700806853cc5a9125d682a` |
| `requirements/ostrov-kak-partitura-mvp-spec-v3.md` | 203853 | `afacb20c14e828a8cb2996fc93fde61c1f95b00546dd6850d57570cd257d425d` |
| `mockups/desktop/33-desktop-score-streamlined-toolbar.png` | 1850979 | `d680ef61b82e7d114476783741558fafd6297282a23a9881379c12c32956c4e0` |
| `mockups/desktop/34-desktop-filters-full-sidebar.png` | 1603126 | `cae0bf04bdf6ad0a6c046700344d4b26c3ba0c3572978b92d3baac20472451bb` |
| `mockups/desktop/35-desktop-empty-route-general-map.png` | 1874751 | `6266519b8f3ea265f24072245fe5e5fbf0be47bb446231baaa7c5f4c114d77ea` |
| `mockups/desktop/36-desktop-empty-route-map-layer.png` | 1729423 | `5912f91801dae19804014c3a9e1036aea6f8c25fc8d8ee90e086f1d449c7ecb6` |
| `mockups/desktop/37-desktop-add-event-mode.png` | 1590408 | `c19264c0caac03cd9aa34f5550c1c859d9703d4368ebc9027d9f9b38baddb422` |
| `mockups/desktop/38-desktop-event-inspector.png` | 1593410 | `8dd4d3c635735c224d13fa6e198a8fe048bd1a3e1276bebe71a4b4cc043cde51` |
| `mockups/desktop/39-desktop-event-detail-drawer.png` | 1663074 | `ddcf3755dc3d010a1a0e2faa1c95f24f78d73bc1ca2b9f035b58e1cf2635aabd` |
| `mockups/desktop/40-desktop-route-inline-controls.png` | 1817958 | `c78ecf111013f14275e744e7bf0bf90469c6816cede85874f566e3b5df1e4176` |
| `mockups/desktop/41-desktop-map-first-vertical.png` | 1864030 | `d422fdb01d1e4c25c401ed3c4d807d72d30af77199cca4ab71faeaa59da3d311` |
| `references/desktop-source-before-v3.15.png` | 1787597 | `3d73443de6d0f24e7a1eeb4f14f68418c0f9d9920e77aadc165810f5dad9ea9a` |
| `references/desktop-source-empty-route.png` | 1729423 | `5912f91801dae19804014c3a9e1036aea6f8c25fc8d8ee90e086f1d449c7ecb6` |

## Ожидаемые артефакты в ветке

- 1 единое ТЗ;
- 9 актуальных desktop-макетов;
- 2 исходных desktop-референса;
- 1 handoff README;
- 1 implementation-gap;
- этот manifest;
- ссылка на handoff из корневого README репозитория.

## Осознанно отсутствуют

Отдельные файлы исторических mobile-макетов 07–26 и
`ostrov-kak-partitura-static-config-contract-v1.md` не были доступны при
формировании ветки. Их актуальные продуктовые и технические требования
консолидированы в ТЗ 3.15. Отсутствие файлов также зафиксировано в handoff
README, чтобы не создавать ложного ощущения полного визуального архива.
