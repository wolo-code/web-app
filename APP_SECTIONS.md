# App Section Names

Use these names consistently in code comments, tickets, copy docs, and design notes.

| Section | Use this name | Current implementation signal | Purpose |
| --- | --- | --- | --- |
| Initial landing screen | Decode View | `body.decode` | Entry state for typing or pasting a Wolo Code before opening the map. |
| Interactive map screen | Map View | `body.map` and `body.satellite` | Map interaction state for locating, selecting, encoding, and viewing places. |

Related naming:

- `Satellite View`: visual map type variant inside Map View.
- `Action Menu`: expandable bottom-left control that opens Info, Map, and Email actions.
