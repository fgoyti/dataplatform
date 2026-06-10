// Global variables
let hierarchyData = null;
let currentNode = null;
let svg = null;
let g = null;
let treemap = null;
let breadcrumbPath = [];

// Color schemes by level
const levelColors = {
    15: '#667eea',
    17: '#2C4A52',
    20: '#52A6A6',
    30: '#D4B86A'
};

// Load and parse Excel file
async function loadExcelData() {
    try {
        const response = await fetch('UT Hierarchy - Effective on 2026-05-04.xlsx');
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            raw: false,
            defval: ''
        });
        
        console.log('Loaded data:', jsonData.length, 'rows');
        
        // Build hierarchy
        hierarchyData = buildHierarchy(jsonData);
        
        console.log('Built hierarchy:', hierarchyData);
        
        // Create visualization
        createVisualization();
        
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
        children: [],
        _children: null
    };
    
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
                    _children: null,
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
                    children: [],
                    _children: null
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
                    children: [],
                    _children: null
                });
            }
        }
    });
    
    // Build the tree structure
    level30Map.forEach(item => {
        const parent = level20Map.get(item.parentCode);
        if (parent) {
            parent.children.push(item);
        }
    });
    
    level20Map.forEach(item => {
        const parent = level17Map.get(item.parentCode);
        if (parent) {
            parent.children.push(item);
        }
    });
    
    level17Map.forEach(item => {
        root.children.push(item);
    });
    
    console.log('Level 17 items:', level17Map.size);
    console.log('Level 20 items:', level20Map.size);
    console.log('Level 30 items:', level30Map.size);
    
    return root;
}

// Create the tree visualization
function createVisualization() {
    const container = document.getElementById('visualization');
    container.innerHTML = '';
    
    const width = 1200;
    const height = 800;
    
    svg = d3.select('#visualization')
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    
    g = svg.append('g')
        .attr('transform', 'translate(160,40)');
    
    treemap = d3.tree()
        .size([height - 80, width - 200]);
    
    // Start with root node
    currentNode = hierarchyData;
    breadcrumbPath = [hierarchyData];
    updateTree(hierarchyData);
    updateBreadcrumb();
}

// Update the tree visualization
function updateTree(source) {
    const duration = 750;
    
    // Create a hierarchy with only the current node and its children (max 2 levels)
    const root = d3.hierarchy(source, d => d.children);
    
    // Limit to 2 levels deep (current node + 1 level of children)
    root.each(d => {
        if (d.depth >= 2) {
            d.children = null;
        }
    });
    
    // Compute the tree layout
    treemap(root);
    
    // Get all nodes and links
    const nodes = root.descendants();
    const links = root.links();
    
    // Clamp vertical spacing to prevent excessive gaps
    const maxLeafSpacing = 50; // Maximum pixels between leaf nodes
    const maxParentSpacing = 100; // Maximum pixels between parent nodes
    
    // Group nodes by depth
    const nodesByDepth = d3.group(nodes, d => d.depth);
    
    nodesByDepth.forEach((depthNodes, depth) => {
        if (depthNodes.length > 1) {
            // Separate leaf nodes and parent nodes
            const leafNodes = depthNodes.filter(node => !node.children || node.children.length === 0);
            const parentNodes = depthNodes.filter(node => node.children && node.children.length > 0);
            
            // Apply spacing limit to leaf nodes
            if (leafNodes.length > 1) {
                leafNodes.sort((a, b) => a.x - b.x);
                const totalSpacing = leafNodes[leafNodes.length - 1].x - leafNodes[0].x;
                const avgSpacing = totalSpacing / (leafNodes.length - 1);
                
                if (avgSpacing > maxLeafSpacing) {
                    const centerY = d3.mean(leafNodes, d => d.x);
                    leafNodes.forEach((node, i) => {
                        node.x = centerY - ((leafNodes.length - 1) / 2 - i) * maxLeafSpacing;
                    });
                }
            }
            
            // Apply spacing limit to parent nodes
            if (parentNodes.length > 1) {
                parentNodes.sort((a, b) => a.x - b.x);
                const totalSpacing = parentNodes[parentNodes.length - 1].x - parentNodes[0].x;
                const avgSpacing = totalSpacing / (parentNodes.length - 1);
                
                if (avgSpacing > maxParentSpacing) {
                    const centerY = d3.mean(parentNodes, d => d.x);
                    parentNodes.forEach((node, i) => {
                        node.x = centerY - ((parentNodes.length - 1) / 2 - i) * maxParentSpacing;
                    });
                }
            }
        }
    });
    
    // Normalize for fixed-depth and track display level
    nodes.forEach(d => {
        d.y = d.depth * 250;
        d.displayLevel = d.depth; // Track the display level (0, 1, or 2)
    });
    
    console.log('Nodes with depths:', nodes.map(d => ({ name: d.data.name, depth: d.depth, displayLevel: d.displayLevel })));
    
    // Update nodes
    const node = g.selectAll('.node')
        .data(nodes, d => d.data.code);
    
    // Enter new nodes
    const nodeEnter = node.enter()
        .append('g')
        .attr('class', d => {
            let classes = 'node';
            if (d.data.children && d.data.children.length > 0) {
                classes += ' has-children';
            }
            classes += ` level-${d.data.level}`;
            return classes;
        })
        .attr('transform', d => `translate(${source.y0 || 0},${source.x0 || 0})`)
        .on('click', (event, d) => handleNodeClick(event, d));
    
    nodeEnter.append('circle')
        .attr('r', 1e-6);
    
    nodeEnter.append('text')
        .attr('dy', d => {
            // Level 2 OR (Level 1 with no children) - position to the right
            if (d.displayLevel >= 2 || (d.displayLevel === 1 && (!d.children || d.children.length === 0))) {
                return '.35em';
            }
            return '-1.2em';
        })
        .attr('y', d => {
            if (d.displayLevel >= 2 || (d.displayLevel === 1 && (!d.children || d.children.length === 0))) {
                return 0;
            }
            return -10;
        })
        .attr('x', d => {
            if (d.displayLevel >= 2 || (d.displayLevel === 1 && (!d.children || d.children.length === 0))) {
                return 13;
            }
            return 0;
        })
        .attr('text-anchor', d => {
            if (d.displayLevel >= 2 || (d.displayLevel === 1 && (!d.children || d.children.length === 0))) {
                return 'start';
            }
            return 'middle';
        })
        .text(d => d.data.name)
        .style('fill-opacity', 1e-6)
        .style('cursor', d => (d.data.children && d.data.children.length > 0) ? 'pointer' : 'default')
        .on('click', (event, d) => handleNodeClick(event, d));
    
    
    // Transition nodes to their new position
    const nodeUpdate = nodeEnter.merge(node);
    
    // Update text positioning for existing nodes too
    nodeUpdate.select('text')
        .attr('dy', d => {
            if (d.displayLevel >= 2 || (d.displayLevel === 1 && (!d.children || d.children.length === 0))) {
                return '.35em';
            }
            return '-1.2em';
        })
        .attr('y', d => {
            if (d.displayLevel >= 2 || (d.displayLevel === 1 && (!d.children || d.children.length === 0))) {
                return 0;
            }
            return -10;
        })
        .attr('x', d => {
            if (d.displayLevel >= 2 || (d.displayLevel === 1 && (!d.children || d.children.length === 0))) {
                return 13;
            }
            return 0;
        })
        .attr('text-anchor', d => {
            if (d.displayLevel >= 2 || (d.displayLevel === 1 && (!d.children || d.children.length === 0))) {
                return 'start';
            }
            return 'middle';
        });
    
    nodeUpdate.transition()
        .duration(duration)
        .attr('transform', d => `translate(${d.y},${d.x})`);
    
    nodeUpdate.select('circle')
        .transition()
        .duration(duration)
        .attr('r', 6)
        .style('fill', d => levelColors[d.data.level] || '#999');
    
    nodeUpdate.select('text')
        .transition()
        .duration(duration)
        .style('fill-opacity', 1);
    
    nodeUpdate.select('.node-badge')
        .transition()
        .duration(duration)
        .style('fill-opacity', 1);
    
    // Remove old nodes
    const nodeExit = node.exit()
        .transition()
        .duration(duration)
        .attr('transform', d => `translate(${source.y},${source.x})`)
        .remove();
    
    nodeExit.select('circle')
        .attr('r', 1e-6);
    
    nodeExit.select('text')
        .style('fill-opacity', 1e-6);
    
    nodeExit.select('.node-badge')
        .style('fill-opacity', 1e-6);
    
    // Update links
    const link = g.selectAll('.link')
        .data(links, d => d.target.data.code);
    
    const linkEnter = link.enter()
        .insert('path', 'g')
        .attr('class', 'link')
        .attr('d', d => {
            const o = { x: source.x0 || 0, y: source.y0 || 0 };
            return diagonal(o, o);
        });
    
    const linkUpdate = linkEnter.merge(link);
    
    linkUpdate.transition()
        .duration(duration)
        .attr('d', d => diagonal(d.source, d.target));
    
    link.exit()
        .transition()
        .duration(duration)
        .attr('d', d => {
            const o = { x: source.x, y: source.y };
            return diagonal(o, o);
        })
        .remove();
    
    // Store old positions for transition
    nodes.forEach(d => {
        d.x0 = d.x;
        d.y0 = d.y;
    });
}

// Create diagonal path for links
function diagonal(s, d) {
    return `M ${s.y} ${s.x}
            C ${(s.y + d.y) / 2} ${s.x},
              ${(s.y + d.y) / 2} ${d.x},
              ${d.y} ${d.x}`;
}

// Handle node click - show only clicked node's children
function handleNodeClick(event, d) {
    if (d.data.children && d.data.children.length > 0) {
        // Navigate to this node - it becomes the new root
        currentNode = d.data;
        
        // Only add to breadcrumb if it's not already the last item
        if (breadcrumbPath[breadcrumbPath.length - 1] !== d.data) {
            breadcrumbPath.push(d.data);
        }
        
        updateTree(d.data);
        updateBreadcrumb();
    }
}

// Update breadcrumb navigation
function updateBreadcrumb() {
    const breadcrumbDiv = document.getElementById('breadcrumb-path');
    breadcrumbDiv.innerHTML = '';
    
    breadcrumbPath.forEach((node, index) => {
        const span = document.createElement('span');
        span.className = 'breadcrumb-item';
        span.textContent = node.name;
        
        // Make all items except the last one clickable
        if (index < breadcrumbPath.length - 1) {
            span.classList.add('clickable');
            span.onclick = () => navigateToNode(index);
        }
        
        breadcrumbDiv.appendChild(span);
    });
}

// Navigate to a specific node in the breadcrumb path
function navigateToNode(index) {
    breadcrumbPath = breadcrumbPath.slice(0, index + 1);
    currentNode = breadcrumbPath[breadcrumbPath.length - 1];
    updateTree(currentNode);
    updateBreadcrumb();
}

// Reset to root
function resetTree() {
    currentNode = hierarchyData;
    breadcrumbPath = [hierarchyData];
    updateTree(hierarchyData);
    updateBreadcrumb();
}

// Expand all nodes (show full tree from current node)
function expandAll() {
    // This would show all descendants at once
    // For now, just show immediate children
    if (currentNode.children && currentNode.children.length > 0) {
        updateTree(currentNode);
    }
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', loadExcelData);

// Made with Bob
