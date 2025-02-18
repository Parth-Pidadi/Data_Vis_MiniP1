let data = [];
let currentOrientation = 'vertical';
let margin = { top: 60, right: 40, bottom: 80, left: 80 };
let width = 1000 - margin.left - margin.right;
let height = 500 - margin.top - margin.bottom;

// Variables
const numericalColumns = ['PM2.5', 'PM10', 'NO', 'NO2', 'NOx', 'NH3', 'CO', 'SO2', 'O3', 'Benzene', 'Toluene', 'Xylene', 'AQI'];
const categoricalColumns = ['City', 'AQI_Bucket'];
const allVariables = [...numericalColumns, ...categoricalColumns];

// Category mapping 
let cityToId = {};
let idToCity = {};
let aqiBucketToId = {};
let idToAqiBucket = {};

const unitMap = {
    'PM2.5': 'μg/m³',
    'PM10': 'μg/m³',
    'NO': 'μg/m³',
    'NO2': 'μg/m³',
    'NOx': 'μg/m³',
    'NH3': 'μg/m³',
    'CO': 'mg/m³',
    'SO2': 'μg/m³',
    'O3': 'μg/m³',
    'Benzene': 'μg/m³',
    'Toluene': 'μg/m³',
    'Xylene': 'μg/m³',
    'AQI': ''
};

const aqiBucketOrder = ['Good', 'Satisfactory', 'Moderate', 'Poor', 'Very Poor', 'Severe'];


function createCategoryMappings(data) {
    
    const uniqueCities = [...new Set(data.map(d => d.City))].sort();
    uniqueCities.forEach((city, index) => {
        cityToId[city] = index;
        idToCity[index] = city;
    });

    
    aqiBucketOrder.forEach((bucket, index) => {
        aqiBucketToId[bucket] = index;
        idToAqiBucket[index] = bucket;
    });
}


function getCategoryId(value, category) {
    if (category === 'City') {
        return cityToId[value];
    } else if (category === 'AQI_Bucket') {
        return aqiBucketToId[value];
    }
    return value;
}


function getCategoryValue(id, category) {
    if (category === 'City') {
        return idToCity[id];
    } else if (category === 'AQI_Bucket') {
        return idToAqiBucket[id];
    }
    return id;
}

document.addEventListener('DOMContentLoaded', function() {
    initializeUI();
    loadData();
    setupEventListeners();
});

function initializeUI() {
    const variable1Select = document.getElementById('variable1');
    const variable2Select = document.getElementById('variable2');
    const var2Group = document.getElementById('var2Group');
    
    var2Group.style.display = 'none';
    
    allVariables.forEach(variable => {
        const option1 = document.createElement('option');
        option1.value = variable;
        option1.text = variable + (numericalColumns.includes(variable) && unitMap[variable] ? ` (${unitMap[variable]})` : '');
        variable1Select.appendChild(option1);

        const option2 = document.createElement('option');
        option2.value = variable;
        option2.text = variable + (numericalColumns.includes(variable) && unitMap[variable] ? ` (${unitMap[variable]})` : '');
        variable2Select.appendChild(option2);
    });
    
    variable1Select.value = numericalColumns[0];
    variable2Select.value = numericalColumns[1];
}

function setupEventListeners() {
    document.getElementById('variable1').addEventListener('change', updateVisualization);
    document.getElementById('variable2').addEventListener('change', updateVisualization);
    
    document.getElementById('orientationToggle').addEventListener('click', () => {
        currentOrientation = currentOrientation === 'vertical' ? 'horizontal' : 'vertical';
        updateVisualization();
    });
    
    document.querySelectorAll('input[name="analysisType"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const var2Group = document.getElementById('var2Group');
            var2Group.style.display = e.target.value === 'double' ? 'block' : 'none';
            updateVisualization();
        });
    });
}

function loadData() {
    d3.csv("city_day_sample.csv")
        .then(function(loadedData) {
            console.log("Data loaded successfully:", loadedData.length, "rows");
            data = loadedData;
            createCategoryMappings(data);
            updateVisualization();
        })
        .catch(function(error) {
            console.error("Error loading data:", error);
            alert("Error loading the data file. Please check if city_day_sample.csv is in the correct location.");
        });
}

function createBarChart(svg, variable) {
    let frequencies;
    let barData;
    
    if (variable === 'AQI_Bucket') {
        frequencies = d3.rollup(data, v => v.length, d => d[variable]);
        barData = aqiBucketOrder
            .map(bucket => ({
                key: bucket,
                value: frequencies.get(bucket) || 0,
                id: getCategoryId(bucket, variable)
            }));
    } else if (variable === 'City') {
        frequencies = d3.rollup(data, v => v.length, d => d[variable]);
        barData = Array.from(frequencies, ([key, value]) => ({
            key,
            value,
            id: getCategoryId(key, variable)
        }));
    } else {
        frequencies = d3.rollup(data, v => v.length, d => d[variable]);
        barData = Array.from(frequencies, ([key, value]) => ({key, value}));
    }
    
    if (currentOrientation === 'vertical') {
        const x = d3.scaleBand()
            .range([0, width])
            .padding(0.1)
            .domain(barData.map(d => d.key));
        
        const y = d3.scaleLinear()
            .range([height, 0])
            .domain([0, d3.max(barData, d => d.value)]);
        
        svg.selectAll('.bar')
            .data(barData)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', d => x(d.key))
            .attr('width', x.bandwidth())
            .attr('y', d => y(d.value))
            .attr('height', d => height - y(d.value))
            .append('title')
            .text(d => `${d.key}${d.id !== undefined ? ` (ID: ${d.id})` : ''}\nCount: ${d.value}`);
        
        svg.append('g')
            .attr('class', 'axis')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x))
            .selectAll('text')
            .style('text-anchor', 'end')
            .attr('transform', 'rotate(-45)');
        
        svg.append('g')
            .attr('class', 'axis')
            .call(d3.axisLeft(y));
            
        addChartLabels(svg, variable, 'Number of Observations', 'bar');
    } else {
        
        const y = d3.scaleBand()
            .range([height, 0])
            .padding(0.1)
            .domain(barData.map(d => d.key));
        
        const x = d3.scaleLinear()
            .range([0, width])
            .domain([0, d3.max(barData, d => d.value)]);
        
        svg.selectAll('.bar')
            .data(barData)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('y', d => y(d.key))
            .attr('height', y.bandwidth())
            .attr('x', 0)
            .attr('width', d => x(d.value))
            .append('title')
            .text(d => `${d.key}${d.id !== undefined ? ` (ID: ${d.id})` : ''}\nCount: ${d.value}`);
        
        svg.append('g')
            .attr('class', 'axis')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x));
        
        svg.append('g')
            .attr('class', 'axis')
            .call(d3.axisLeft(y));
            
        addChartLabels(svg, 'Number of Observations', variable, 'bar');
    }
}

function createHistogram(svg, variable) {
    let values;
    if (categoricalColumns.includes(variable)) {
        values = data.map(d => getCategoryId(d[variable], variable));
    } else {
        values = data.map(d => +d[variable]).filter(d => !isNaN(d));
    }
    
    const histogram = d3.histogram()
        .domain(d3.extent(values))
        .thresholds(20);
    
    const bins = histogram(values);
    
    if (currentOrientation === 'vertical') {
        const x = d3.scaleLinear()
            .domain([bins[0].x0, bins[bins.length - 1].x1])
            .range([0, width]);
        
        const y = d3.scaleLinear()
            .domain([0, d3.max(bins, d => d.length)])
            .range([height, 0]);
        
        svg.selectAll('.bar')
            .data(bins)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', d => x(d.x0))
            .attr('width', d => x(d.x1) - x(d.x0))
            .attr('y', d => y(d.length))
            .attr('height', d => height - y(d.length))
            .append('title')
            .text(d => {
                if (categoricalColumns.includes(variable)) {
                    return `Category: ${getCategoryValue(Math.floor(d.x0), variable)}\nCount: ${d.length}`;
                }
                return `Range: ${d.x0.toFixed(2)} - ${d.x1.toFixed(2)}\nCount: ${d.length}`;
            });
        
        svg.append('g')
            .attr('class', 'axis')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x).ticks(10));
        
        svg.append('g')
            .attr('class', 'axis')
            .call(d3.axisLeft(y));
            
        addChartLabels(svg, variable, 'Number of Observations', 'histogram');
    } else {
        
        const y = d3.scaleLinear()
            .domain([bins[0].x0, bins[bins.length - 1].x1])
            .range([height, 0]);
        
        const x = d3.scaleLinear()
            .domain([0, d3.max(bins, d => d.length)])
            .range([0, width]);
        
        svg.selectAll('.bar')
            .data(bins)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('y', d => y(d.x1))
            .attr('height', d => y(d.x0) - y(d.x1))
            .attr('x', 0)
            .attr('width', d => x(d.length))
            .append('title')
            .text(d => {
                if (categoricalColumns.includes(variable)) {
                    return `Category: ${getCategoryValue(Math.floor(d.x0), variable)}\nCount: ${d.length}`;
                }
                return `Range: ${d.x0.toFixed(2)} - ${d.x1.toFixed(2)}\nCount: ${d.length}`;
            });
        
        svg.append('g')
            .attr('class', 'axis')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x));
        
        svg.append('g')
            .attr('class', 'axis')
            .call(d3.axisLeft(y));
            
        addChartLabels(svg, 'Number of Measurements', variable, 'histogram');
    }
}

function createScatterPlot(svg, var1, var2) {
    const getValueForPlot = (d, variable) => {
        if (categoricalColumns.includes(variable)) {
            return getCategoryId(d[variable], variable);
        }
        return +d[variable];
    };

    const filteredData = data.filter(d => {
        const val1 = getValueForPlot(d, var1);
        const val2 = getValueForPlot(d, var2);
        return !isNaN(val1) && !isNaN(val2);
    });
    
    const x = d3.scaleLinear()
        .domain(d3.extent(filteredData, d => getValueForPlot(d, var1)))
        .range([0, width]);
    
    const y = d3.scaleLinear()
        .domain(d3.extent(filteredData, d => getValueForPlot(d, var2)))
        .range([height, 0]);
    
    svg.selectAll('.scatter-dot')
        .data(filteredData)
        .enter()
        .append('circle')
        .attr('class', 'scatter-dot')
        .attr('cx', d => x(getValueForPlot(d, var1)))
        .attr('cy', d => y(getValueForPlot(d, var2)))
        .attr('r', 4)
        .append('title')
        .text(d => {
            const val1 = categoricalColumns.includes(var1) ? 
                `${d[var1]} (ID: ${getCategoryId(d[var1], var1)})` : d[var1];
            const val2 = categoricalColumns.includes(var2) ? 
                `${d[var2]} (ID: ${getCategoryId(d[var2], var2)})` : d[var2];
            return `${var1}: ${val1}\n${var2}: ${val2}`;
        });
    
    svg.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x));
    
        svg.append('g')
        .attr('class', 'axis')
        .call(d3.axisLeft(y));
    
    addChartLabels(svg, var1, var2, 'scatter');
}

function createStripPlot(svg, var1, var2) {
    const categoricalVar = categoricalColumns.includes(var1) ? var1 : var2;
    const numericalVar = categoricalColumns.includes(var1) ? var2 : var1;
    
    const filteredData = data.filter(d => !isNaN(+d[numericalVar]));
    
    let domain;
    if (categoricalVar === 'AQI_Bucket') {
        domain = aqiBucketOrder;
    } else if (categoricalVar === 'City') {
        domain = [...new Set(filteredData.map(d => d[categoricalVar]))].sort();
    } else {
        domain = [...new Set(filteredData.map(d => d[categoricalVar]))];
    }
    
    if (currentOrientation === 'vertical') {
        const x = d3.scaleBand()
            .domain(domain)
            .range([0, width])
            .padding(0.1);
        
        const y = d3.scaleLinear()
            .domain(d3.extent(filteredData, d => +d[numericalVar]))
            .range([height, 0]);
        
        const jitterWidth = x.bandwidth() * 0.4;
        
        svg.selectAll('.strip-dot')
            .data(filteredData)
            .enter()
            .append('circle')
            .attr('class', 'strip-dot')
            .attr('cx', d => {
                const position = x(d[categoricalVar]);
                return position ? position + (Math.random() - 0.5) * jitterWidth : 0;
            })
            .attr('cy', d => y(+d[numericalVar]))
            .attr('r', 4)
            .append('title')
            .text(d => {
                const catValue = d[categoricalVar];
                const catId = getCategoryId(catValue, categoricalVar);
                return `${categoricalVar}: ${catValue} (ID: ${catId})\n${numericalVar}: ${d[numericalVar]}`;
            });
        
        svg.append('g')
            .attr('class', 'axis')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x))
            .selectAll('text')
            .style('text-anchor', 'end')
            .attr('transform', 'rotate(-45)');
        
        svg.append('g')
            .attr('class', 'axis')
            .call(d3.axisLeft(y));
            
        addChartLabels(svg, categoricalVar, numericalVar, 'strip');
    } else {
        const y = d3.scaleBand()
            .domain(domain)
            .range([height, 0])
            .padding(0.1);
        
        const x = d3.scaleLinear()
            .domain(d3.extent(filteredData, d => +d[numericalVar]))
            .range([0, width]);
        
        const jitterHeight = y.bandwidth() * 0.4;
        
        svg.selectAll('.strip-dot')
            .data(filteredData)
            .enter()
            .append('circle')
            .attr('class', 'strip-dot')
            .attr('cy', d => {
                const position = y(d[categoricalVar]);
                return position ? position + (Math.random() - 0.5) * jitterHeight : 0;
            })
            .attr('cx', d => x(+d[numericalVar]))
            .attr('r', 4)
            .append('title')
            .text(d => {
                const catValue = d[categoricalVar];
                const catId = getCategoryId(catValue, categoricalVar);
                return `${categoricalVar}: ${catValue} (ID: ${catId})\n${numericalVar}: ${d[numericalVar]}`;
            });
        
        svg.append('g')
            .attr('class', 'axis')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x));
        
        svg.append('g')
            .attr('class', 'axis')
            .call(d3.axisLeft(y));
            
        addChartLabels(svg, numericalVar, categoricalVar, 'strip');
    }
}

function addChartLabels(svg, xLabel, yLabel, chartType) {
    const xDisplayLabel = getDisplayLabel(xLabel);
    const yDisplayLabel = getDisplayLabel(yLabel);
    
    // Title
    let title;
    switch (chartType) {
        case 'scatter':
            title = `Relationship between ${xDisplayLabel} and ${yDisplayLabel}`;
            break;
        case 'strip':
            title = `Distribution of ${yDisplayLabel} by ${xDisplayLabel}`;
            break;
        case 'histogram':
            title = `Distribution of ${xDisplayLabel}`;
            break;
        case 'bar':
            title = `Count by ${xDisplayLabel}`;
            break;
    }
    
    svg.append('text')
        .attr('class', 'chart-title')
        .attr('x', width / 2)
        .attr('y', -margin.top / 2)
        .style('text-anchor', 'middle')
        .text(title);
    
    // X axis label
    svg.append('text')
        .attr('class', 'axis-label')
        .attr('x', width / 2)
        .attr('y', height + margin.bottom - 10)
        .style('text-anchor', 'middle')
        .text(xDisplayLabel);
    
    // Y axis label
    svg.append('text')
        .attr('class', 'axis-label')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', -margin.left + 20)
        .style('text-anchor', 'middle')
        .text(yDisplayLabel);
}

function getDisplayLabel(variable) {
    let label = variable;
    if (categoricalColumns.includes(variable)) {
        label += ' (Category ID)';
    }
    if (numericalColumns.includes(variable) && unitMap[variable]) {
        label += ` (${unitMap[variable]})`;
    }
    return label;
}

function updateVisualization() {
    if (!data.length) return;

    const analysisType = document.querySelector('input[name="analysisType"]:checked').value;
    const var1 = document.getElementById('variable1').value;
    const var2 = document.getElementById('variable2').value;
    
    d3.select('#visualization').html('');
    
    const svg = d3.select('#visualization')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    if (analysisType === 'single') {
        if (categoricalColumns.includes(var1)) {
            createBarChart(svg, var1);
        } else {
            createHistogram(svg, var1);
        }
    } else {
        if ((numericalColumns.includes(var1) && categoricalColumns.includes(var2)) || 
            (numericalColumns.includes(var2) && categoricalColumns.includes(var1))) {
            createStripPlot(svg, var1, var2);
        } else {
            createScatterPlot(svg, var1, var2);
        }
    }
}