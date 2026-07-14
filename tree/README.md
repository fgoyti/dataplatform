# Data Platform Starburst Visualization

An interactive, modern web-based visualization of the UT Hierarchy data showing the Data Platform structure in a beautiful starburst/sunburst chart.

## Features

- **Interactive Starburst Chart**: Data Platform at the center with hierarchical levels radiating outward
- **Click to Expand**: Click on any segment to expand and explore deeper levels
- **Color-Coded Categories**: Each major category (Level 17) has its own color scheme:
  - 🔵 **AI Productivity** (Purple/Blue)
  - 🔷 **AI/ML Ops** (Cyan/Teal)
  - 🟢 **Data Fabric** (Green)
  - 🟠 **Confluent** (Orange)
- **Dynamic Navigation**: 
  - Reset to home view
  - Expand all levels at once
  - Collapse to major categories
- **Tooltips**: Hover over segments to see details
- **Breadcrumb Navigation**: Track your current location in the hierarchy
- **Info Panel**: Displays detailed information about selected items

## Structure

The visualization displays 4 hierarchical levels:

1. **Center (Level 15)**: Data Platform
2. **Inner Ring (Level 17)**: Major categories (AI Productivity, AI/ML Ops, Data Fabric, Confluent)
3. **Middle Ring (Level 20)**: Sub-categories (e.g., Business Analytics, Databases, AI Tools)
4. **Outer Ring (Level 30)**: Individual products (e.g., watsonx BI, Db2, MongoDB)

## How to Use

### Running Locally

1. Ensure all files are in the same directory:
   - `index.html`
   - `tree.js`
   - `UT Hierarchy - Effective on 2026-05-04.xlsx`

2. Start a local web server:
   ```bash
   # Using Python 3
   python3 -m http.server 8000
   
   # Or using Python 2
   python -m SimpleHTTPServer 8000
   
   # Or using Node.js
   npx http-server -p 8000
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:8000
   ```

### Interacting with the Visualization

- **Click a segment**: Expand to show its children or zoom into that section
- **Hover over segments**: See tooltips with additional information
- **Use control buttons**:
  - 🏠 **Reset View**: Return to the main Data Platform view
  - ➕ **Expand All**: Show all levels at once
  - ➖ **Collapse to Level 17**: Show only major categories
- **Read the breadcrumb**: Track your navigation path at the top
- **Check the info panel**: View details about the selected item at the bottom
- **Reference the legend**: Identify categories by color

## Technical Details

### Technologies Used

- **D3.js v7**: For creating the interactive sunburst/starburst visualization
- **SheetJS (xlsx)**: For parsing Excel files
- **Vanilla JavaScript**: For application logic
- **Modern CSS**: For styling with gradients and animations

### Browser Compatibility

Works best in modern browsers:
- Chrome/Edge (recommended)
- Firefox
- Safari

### File Structure

```
.
├── index.html              # Main HTML page with structure and styles
├── tree.js                 # JavaScript for data parsing and D3.js visualization
├── UT Hierarchy - Effective on 2026-05-04.xlsx  # Source data
├── README.md               # This file
├── .gitignore              # Git ignore file
└── archive/                # Archived previous versions
    ├── header-options.html
    ├── starburst.html
    └── starburst.js
```

## Data Structure

The Excel file contains the following hierarchy:

- **UT Level 10**: IBM Software (root)
- **UT Level 15**: Data Platform (visualization center)
- **UT Level 17**: Major categories (4 categories)
- **UT Level 20**: Sub-categories (~20 items)
- **UT Level 30**: Products (~80+ products)

## Customization

### Changing Colors

Edit the `colorSchemes` object in `tree.js`:

```javascript
const colorSchemes = {
    '177EB': { // AI Productivity
        name: 'AI Productivity',
        colors: ['#667eea', '#764ba2', '#8b5cf6', '#a78bfa', '#c4b5fd']
    },
    // ... add or modify color schemes
};
```

### Adjusting Size

Modify the `width` and `height` variables in the `createVisualization()` function:

```javascript
const width = 900;  // Change this
const height = 900; // Change this
```

## Troubleshooting

**Issue**: Visualization shows "Loading data..." indefinitely
- **Solution**: Ensure the Excel file is in the same directory and the web server is running

**Issue**: Segments are too small to read
- **Solution**: Click the "Expand All" button or click individual segments to zoom in

**Issue**: Colors not showing correctly
- **Solution**: Check that Level 17 codes in the data match the `colorSchemes` keys

## Future Enhancements

Potential improvements:
- Export visualization as PNG/SVG
- Search functionality to find specific products
- Filter by category
- Animation transitions when expanding/collapsing
- Mobile-responsive design
- Dark mode toggle

## License

This visualization is created for internal use with IBM Data Platform hierarchy data.

---

**Created**: May 2026  
**Version**: 1.0# dataportfolio
