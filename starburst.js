// Global variables
let hierarchyData = null;
let currentView = null;
let svg = null;
let g = null;
let currentRotation = 0;
let isDragging = false;
let startAngle = 0;
let lastMouseAngle = 0;

// Custom color palette - earthy warm tones
const colorSchemes = {
    '177EB': { // AI Productivity - Dark Blue-Gray to Teal
        name: 'AI Productivity',
        colors: ['#2C4A52', '#3A5F6B', '#487484', '#56899D', '#649EB6']
    },
    '17BG2': { // AI/ML Ops - Teal shades
        name: 'AI/ML Ops',
        colors: ['#52A6A6', '#66B8B8', '#7AC9C9', '#8EDBDB', '#A2EDED']
    },
    '17DSR': { // Data Fabric - Yellow/Gold shades
        name: 'Data Fabric',
        colors: ['#D4B86A', '#DCC57E', '#E4D292', '#ECDFA6', '#F4ECBA']
    },
    '17MZJ': { // Confluent - Coral/Salmon shades
        name: 'Confluent',
        colors: ['#D4876A', '#DC9A7E', '#E4AD92', '#ECC0A6', '#F4D3BA']
    }
};

// Load and parse Excel file
async function loadExcelData() {
    try {
        const response = await fetch('UT Hierarchy - Effective on 2026-05-04.xlsx');
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        
        // Get the first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON with header row
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            raw: false,
            defval: ''
        });
        
        console.log('Loaded data:', jsonData.length, 'rows');
        console.log('Sample row:', jsonData[0]);
        
        // Build hierarchy
        hierarchyData = buildHierarchy(jsonData);
        
        console.log('Built hierarchy:', hierarchyData);
        
        // Create visualization
        createVisualization();
        
        // Create legend
        createLegend();
        
    } catch (error) {
        console.error('Error loading Excel file:', error);
        document.getElementById('visualization').innerHTML =
            '<div class="loading">Error loading data: ' + error.message + '</div>';
    }
}

// Build hierarchical data structure
function buildHierarchy(data) {
    const root = {
        name: 'Data Platform',
        code: '15ANP',
        level: 15,
        children: []
    };
    
    // Group by Level 17 (major categories)
    const level17Map = new Map();
    const level20Map = new Map();
    const level30Map = new Map();
    
    data.forEach(row => {
        const level = parseInt(row['UT Level']);
        
        if (level === 17 && row['UT Parent'] === '15ANP') {
            const code = row['UT Code'];
            if (!level17Map.has(code)) {
                level17Map.set(code, {
                    name: row['Description'],
                    code: code,
                    level: 17,
                    children: [],
                    parent17: code
                });
            }
        } else if (level === 20) {
            const parentCode = row['UT Parent'];
            const code = row['UT Code'];
            if (!level20Map.has(code)) {
                level20Map.set(code, {
                    name: row['Description'],
                    code: code,
                    level: 20,
                    parent17: row['Level 17'],
                    parentCode: parentCode,
                    children: []
                });
            }
        } else if (level === 30) {
            const parentCode = row['UT Parent'];
            const code = row['UT Code'];
            if (!level30Map.has(code)) {
                level30Map.set(code, {
                    name: row['Description'],
                    code: code,
                    level: 30,
                    parent17: row['Level 17'],
                    parentCode: parentCode,
                    children: []
                });
            }
        }
    });
    
    // Build the tree structure
    // Attach level 30 to level 20
    level30Map.forEach(item => {
        const parent = level20Map.get(item.parentCode);
        if (parent) {
            parent.children.push(item);
        }
    });
    
    // Attach level 20 to level 17
    level20Map.forEach(item => {
        const parent = level17Map.get(item.parentCode);
        if (parent) {
            parent.children.push(item);
        }
    });
    
    // Attach level 17 to root
    level17Map.forEach(item => {
        root.children.push(item);
    });
    
    console.log('Level 17 items:', level17Map.size);
    console.log('Level 20 items:', level20Map.size);
    console.log('Level 30 items:', level30Map.size);
    console.log('Root children:', root.children.length);
    
    return root;
}

// Create the starburst visualization
function createVisualization() {
    const container = document.getElementById('visualization');
    container.innerHTML = '';
    
    const width = 900;
    const height = 900;
    const radius = Math.min(width, height) / 2;
    
    svg = d3.select('#visualization')
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('id', 'chart')
        .style('cursor', 'grab');
    
    g = svg.append('g')
        .attr('transform', `translate(${width / 2},${height / 2}) rotate(${currentRotation})`);
    
    // Add drag-to-rotate functionality
    setupDragRotation(svg, width, height);
    
    currentView = hierarchyData;
    updateVisualization(hierarchyData, null);
}

// Setup drag-to-rotate functionality
function setupDragRotation(svg, width, height) {
    const centerX = width / 2;
    const centerY = height / 2;
    
    svg.on('mousedown', function(event) {
        isDragging = true;
        svg.style('cursor', 'grabbing');
        
        const mouseX = event.offsetX - centerX;
        const mouseY = event.offsetY - centerY;
        lastMouseAngle = Math.atan2(mouseY, mouseX) * 180 / Math.PI;
        startAngle = currentRotation;
        
        event.preventDefault();
    });
    
    svg.on('mousemove', function(event) {
        if (!isDragging) return;
        
        const mouseX = event.offsetX - centerX;
        const mouseY = event.offsetY - centerY;
        const currentMouseAngle = Math.atan2(mouseY, mouseX) * 180 / Math.PI;
        
        const deltaAngle = currentMouseAngle - lastMouseAngle;
        currentRotation = startAngle + deltaAngle;
        
        // Apply rotation
        g.attr('transform', `translate(${centerX},${centerY}) rotate(${currentRotation})`);
        
        // Update highlight
        const root = d3.hierarchy(hierarchyData)
            .sum(d => (!d.children || d.children.length === 0) ? 1 : 0);
        const partition = d3.partition().size([2 * Math.PI, 400]);
        partition(root);
        updateHighlight(root, currentRotation);
        
        event.preventDefault();
    });
    
    svg.on('mouseup', function() {
        isDragging = false;
        svg.style('cursor', 'grab');
    });
    
    svg.on('mouseleave', function() {
        isDragging = false;
        svg.style('cursor', 'grab');
    });
    
    // Touch support for mobile
    svg.on('touchstart', function(event) {
        isDragging = true;
        
        const touch = event.touches[0];
        const rect = svg.node().getBoundingClientRect();
        const mouseX = touch.clientX - rect.left - centerX;
        const mouseY = touch.clientY - rect.top - centerY;
        lastMouseAngle = Math.atan2(mouseY, mouseX) * 180 / Math.PI;
        startAngle = currentRotation;
        
        event.preventDefault();
    });
    
    svg.on('touchmove', function(event) {
        if (!isDragging) return;
        
        const touch = event.touches[0];
        const rect = svg.node().getBoundingClientRect();
        const mouseX = touch.clientX - rect.left - centerX;
        const mouseY = touch.clientY - rect.top - centerY;
        const currentMouseAngle = Math.atan2(mouseY, mouseX) * 180 / Math.PI;
        
        const deltaAngle = currentMouseAngle - lastMouseAngle;
        currentRotation = startAngle + deltaAngle;
        
        // Apply rotation
        g.attr('transform', `translate(${centerX},${centerY}) rotate(${currentRotation})`);
        
        // Update highlight
        const root = d3.hierarchy(hierarchyData)
            .sum(d => (!d.children || d.children.length === 0) ? 1 : 0);
        const partition = d3.partition().size([2 * Math.PI, 400]);
        partition(root);
        updateHighlight(root, currentRotation);
        
        event.preventDefault();
    });
    
    svg.on('touchend', function() {
        isDragging = false;
    });
}

// Update visualization with current data - show all nodes
function updateVisualization(data) {
    g.selectAll('*').remove();
    
    const radius = 400;
    const width = 900;
    const height = 900;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Maintain rotation when updating
    g.attr('transform', `translate(${centerX},${centerY}) rotate(${currentRotation})`);
    
    // Create hierarchy - show ALL nodes
    const root = d3.hierarchy(data)
        .sum(d => {
            // Count leaf nodes for sizing
            if (!d.children || d.children.length === 0) return 1;
            return 0;
        })
        .sort((a, b) => b.value - a.value);
    
    console.log('Total nodes:', root.descendants().length);
    
    // Create partition layout
    const partition = d3.partition()
        .size([2 * Math.PI, radius]);
    
    partition(root);
    
    // Create arc generator
    const arc = d3.arc()
        .startAngle(d => d.x0)
        .endAngle(d => d.x1)
        .innerRadius(d => {
            if (d.depth === 0) return 0;
            if (d.depth === 1) return radius * 0.25;
            if (d.depth === 2) return radius * 0.50;
            return radius * 0.75;
        })
        .outerRadius(d => {
            if (d.depth === 0) return radius * 0.20;
            if (d.depth === 1) return radius * 0.45;
            if (d.depth === 2) return radius * 0.70;
            return radius * 0.95;
        });
    
    // Draw arcs - all nodes
    const paths = g.selectAll('path')
        .data(root.descendants())
        .enter()
        .append('path')
        .attr('class', 'arc')
        .attr('d', arc)
        .style('fill', d => getColor(d))
        .style('stroke', '#fff')
        .style('stroke-width', 2)
        .style('pointer-events', 'none') // Disable click events
        .on('mouseover', (event, d) => showTooltip(event, d))
        .on('mouseout', hideTooltip);
    
    // Add text labels - all nodes with enough space
    g.selectAll('text')
        .data(root.descendants().filter(d => d.depth > 0 && (d.x1 - d.x0) > 0.03))
        .enter()
        .append('text')
        .attr('class', 'arc-text')
        .attr('transform', d => {
            const angle = (d.x0 + d.x1) / 2;
            const radius = (arc.innerRadius()(d) + arc.outerRadius()(d)) / 2;
            const x = radius * Math.sin(angle);
            const y = -radius * Math.cos(angle);
            return `translate(${x},${y}) rotate(${angle * 180 / Math.PI - 90})`;
        })
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .style('pointer-events', 'none') // Disable click events
        .text(d => {
            const name = d.data.name;
            const availableSpace = (d.x1 - d.x0) * (arc.innerRadius()(d) + arc.outerRadius()(d)) / 2;
            if (availableSpace < 25) return '';
            if (availableSpace < 60) {
                return name.length > 12 ? name.substring(0, 9) + '...' : name;
            }
            if (availableSpace < 100) {
                return name.length > 18 ? name.substring(0, 15) + '...' : name;
            }
            return name.length > 25 ? name.substring(0, 22) + '...' : name;
        })
        .style('font-size', d => {
            const availableSpace = (d.x1 - d.x0) * (arc.innerRadius()(d) + arc.outerRadius()(d)) / 2;
            if (availableSpace > 120) return '12px';
            if (availableSpace > 80) return '11px';
            if (availableSpace > 50) return '10px';
            if (availableSpace > 30) return '9px';
            return '8px';
        });
    
    // Add center text
    g.append('text')
        .attr('class', 'center-text')
        .attr('dy', '0.35em')
        .text(data.name)
        .style('font-size', '20px')
        .style('pointer-events', 'none');
    
    // Update highlight based on rotation
    updateHighlight(root, currentRotation);
}

// Get color for a node
function getColor(d) {
    if (d.depth === 0) return '#667eea';
    
    // Find the Level 17 code from the data
    let level17Code = d.data.parent17 || d.data.code;
    
    // If this is a level 17 node, use its own code
    if (d.data.level === 17) {
        level17Code = d.data.code;
    }
    
    const scheme = colorSchemes[level17Code];
    
    if (!scheme) {
        console.log('No color scheme for:', level17Code, 'Node:', d.data.name);
        return '#999';
    }
    
    // Use different shades based on depth
    const colorIndex = Math.min(d.depth - 1, scheme.colors.length - 1);
    return scheme.colors[colorIndex];
}



// Show tooltip
function showTooltip(event, d) {
    const tooltip = document.getElementById('tooltip');
    const name = d.data.name;
    const level = d.data.level;
    const childCount = d.data.children ? d.data.children.length : 0;
    
    let content = `<strong>${name}</strong><br>`;
    content += `Level: ${level}<br>`;
    if (childCount > 0) {
        content += `Children: ${childCount}<br>`;
        content += `<em>Click to expand</em>`;
    }
    
    tooltip.innerHTML = content;
    tooltip.style.left = (event.pageX + 10) + 'px';
    tooltip.style.top = (event.pageY + 10) + 'px';
    tooltip.classList.add('show');
}

// Hide tooltip
function hideTooltip() {
    const tooltip = document.getElementById('tooltip');
    tooltip.classList.remove('show');
}

// Update info panel
function updateInfoPanel(data) {
    document.getElementById('info-title').textContent = data.name;
    
    let description = `Level ${data.level} - ${data.code}`;
    if (data.children && data.children.length > 0) {
        description += `<br>Contains ${data.children.length} sub-items`;
    }
    
    document.getElementById('info-description').innerHTML = description;
}

// Update breadcrumb
function updateBreadcrumb(d) {
    const path = [];
    let node = d;
    while (node) {
        path.unshift(node.data.name);
        node = node.parent;
    }
    
    document.getElementById('breadcrumb-text').textContent = path.join(' > ');
}

// Create legend
function createLegend() {
    const legendItems = document.getElementById('legend-items');
    legendItems.innerHTML = '';
    
    Object.entries(colorSchemes).forEach(([code, scheme]) => {
        const item = document.createElement('div');
        item.className = 'legend-item';
        
        const color = document.createElement('div');
        color.className = 'legend-color';
        color.style.background = scheme.colors[0];
        
        const label = document.createElement('span');
        label.textContent = scheme.name;
        
        item.appendChild(color);
        item.appendChild(label);
        legendItems.appendChild(item);
    });
}

// Reset rotation
function resetView() {
    currentRotation = 0;
    updateVisualization(hierarchyData);
    document.getElementById('breadcrumb-text').textContent = 'Data Platform - All Levels Shown';
    document.getElementById('info-title').textContent = 'Data Platform Visualization';
    document.getElementById('info-description').textContent = 'Drag to rotate the visualization. Hover over segments for details. All hierarchy levels are displayed.';
}

// Not used anymore but keeping for button compatibility
function expandAll() {
    // Already showing all
}

function collapseAll() {
    // Already showing all
}

// Update highlight box based on what the arrow is pointing to
function updateHighlight(root, rotation) {
    // Check if elements exist
    const nameEl = document.getElementById('highlight-name');
    if (!nameEl) return; // Elements not ready yet
    
    // Arrow points to the right (0 degrees), which is at angle 0 in the partition
    // Account for rotation: if we rotate clockwise, we need to look at that angle
    const targetAngle = (rotation * Math.PI / 180) % (2 * Math.PI);
    
    // Normalize to 0-2π range
    let normalizedAngle = targetAngle;
    if (normalizedAngle < 0) normalizedAngle += 2 * Math.PI;
    
    // Find which node contains this angle
    let pointedNode = null;
    
    // Check all nodes to find which one contains the target angle
    root.descendants().forEach(d => {
        if (d.depth === 0) return; // Skip root
        
        // Check if the target angle falls within this node's arc
        if (normalizedAngle >= d.x0 && normalizedAngle <= d.x1) {
            // If multiple nodes match (nested), prefer the outermost (highest depth)
            if (!pointedNode || d.depth > pointedNode.depth) {
                pointedNode = d;
            }
        }
    });
    
    // Update the highlight detail box
    if (pointedNode) {
        nameEl.textContent = pointedNode.data.name;
        document.getElementById('highlight-code').textContent = `Code: ${pointedNode.data.code}`;
        document.getElementById('highlight-level').textContent = `Level ${pointedNode.data.level}`;
        
        const childCount = pointedNode.data.children ? pointedNode.data.children.length : 0;
        const childrenEl = document.getElementById('highlight-children');
        if (childCount > 0) {
            childrenEl.textContent = `Contains ${childCount} sub-items`;
        } else {
            childrenEl.textContent = '';
        }
    }
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', loadExcelData);
