class BusSeatManager {
    constructor() {
        this.passengers = [];
        this.locationColors = {};
        this.colorPalette = [
            '#e74c3c', // 빨강
            '#3498db', // 파랑
            '#2ecc71', // 초록
            '#f39c12', // 주황
            '#9b59b6', // 보라
            '#1abc9c', // 청록
            '#e67e22', // 진한 주황
            '#34495e', // 회색
            '#e91e63', // 분홍
            '#00bcd4', // 하늘색
            '#8bc34a', // 연두
            '#ff5722', // 딥 오렌지
            '#795548', // 갈색
            '#607d8b'  // 청회색
        ];
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const parseButton = document.getElementById('parseButton');
        const clearButton = document.getElementById('clearButton');
        const textInput = document.getElementById('textInput');

        parseButton.addEventListener('click', () => this.parseAndDisplay());
        clearButton.addEventListener('click', () => this.clearAll());
        
        // Enter 키로도 파싱 실행 (Ctrl+Enter)
        textInput.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                this.parseAndDisplay();
            }
        });
    }


    parsePassengerText(text) {
        const passengers = [];
        const lines = text.split('\n').filter(line => line.trim());

        for (const line of lines) {
            const passenger = this.parsePassengerLine(line);
            if (passenger) {
                passengers.push(passenger);
            }
        }

        return passengers;
    }


	parsePassengerLine(line) {
     const trimmedLine = line.trim();
     
     // 헤더 및 비승객 정보 필터링
     if (this.isHeaderOrNonPassengerLine(trimmedLine)) {
         return null;
     }
     
     // 기본 패턴: 숫자. 이름(정보들)
     // 괄호 안의 정보를 추출한 후 순서에 상관없이 파싱
     const basicPattern = /(\d+)\.\s*([^(]+)\(([^)]+)\)/;
     let match = trimmedLine.match(basicPattern);
 
     if (match) {
         const [, orderNum, name, infoString] = match;
         
         // 괄호 안의 정보를 쉼표, 마침표, 공백으로 분리
         // 단, 숫자 뒤의 마침표는 소수점일 수 있으므로 주의
         const infoParts = infoString.split(/[,.\s]+/).map(part => part.trim()).filter(part => part.length > 0);
         
         // 각 정보를 분류
         let paymentStatus = 'pending';
         let location = '미지정';
         let seatNumber = null;
         
                for (const part of infoParts) {
                    // 좌석 미지정 키워드 확인
                    const unassignedKeywords = [
                        '미정', '미배정', 
                        '아무곳', '아무데', '아무대',
                        '상관없', 
                        '맘대로', '마음대로',
                        '임의', '임의배정',
                        '없음',
                        '^^', '?', 'x', 'X'
                    ];
                    if (unassignedKeywords.some(keyword => part === keyword || part.includes(keyword))) {
                        // 좌석 미지정으로 표시 (null 유지)
                        continue;
                    }
                    
                    // 좌석번호 확인 (숫자만 있고 뒤에 특수기호가 있을 수 있음)
                    const seatMatch = part.match(/^(\d+)[^\d]*$/);
                    if (seatMatch && seatNumber === null) {
                        const num = parseInt(seatMatch[1]);
                        if (num >= 1 && num <= 28) {
                            seatNumber = num;
                            continue;
                        }
                    }
                    
                    // 탑승지 확인 (사당, 양재, 죽전, 신갈, 복정)
                    const validLocations = ['사당', '양재', '죽전', '신갈', '복정'];
                    const foundLocation = validLocations.find(loc => part.includes(loc));
                    if (foundLocation && location === '미지정') {
                        location = foundLocation;
                        continue;
                    }
                    
                    // 입금 상태 확인
                    const normalizedStatus = this.normalizePaymentStatus(part);
                    if (normalizedStatus !== 'pending' || this.isPaymentStatusKeyword(part)) {
                        paymentStatus = normalizedStatus;
                        continue;
                    }
                }
         
         return {
             orderNumber: parseInt(orderNum),
             name: name.trim(),
             paymentStatus: paymentStatus,
             location: location,
             seatNumber: seatNumber
         };
     }
     
     // 빈 항목 패턴: "숫자. " 또는 "숫자." (이름이 없는 경우)
     const emptyItemPattern = /^(\d+)\.\s*$/;
     if (emptyItemPattern.test(trimmedLine)) {
         return null; // 빈 항목은 무시
     }
     
     // 괄호 안에 정보가 부족한 경우 처리 (예: "1. 김진욱(입완, 양재)")
     // 이미 위에서 처리되었으므로 seatNumber가 null이면 그대로 반환
     
     // 이름만 있는 패턴: "숫자. 이름" (괄호가 없는 경우)
     const nameOnlyPattern = /^(\d+)\.\s*([^\s(]+)$/;
     const nameMatch = trimmedLine.match(nameOnlyPattern);
     
     if (nameMatch) {
         const [, orderNum, name] = nameMatch;
         return {
             orderNumber: parseInt(orderNum),
             name: name.trim(),
             paymentStatus: 'pending', // 기본값
             location: '미지정',
             seatNumber: null // 좌석번호 없음
         };
     }
 
     return null;
	}

    // 헤더 및 비승객 정보 필터링
    isHeaderOrNonPassengerLine(line) {
        // 빈 줄
        if (!line || line.length === 0) {
            return true;
        }
        
        // 괄호로 시작하는 줄 (예: "(10/25토) 만추, 설악산 천불동!!")
        if (line.startsWith('(')) {
            return true;
        }
        
        // 별표로 시작하는 줄 (예: "* 소공원 ~ 천당폭포 왕복")
        if (line.startsWith('*')) {
            return true;
        }
        
        // 대시로 시작하는 줄 (예: " - 14km/6.5h/획득고도 500m")
        if (line.startsWith('-')) {
            return true;
        }
        
        // 더하기로 시작하는 줄 (예: "   + 만항재(등산 x, 상고대 사진)")
        if (line.trim().startsWith('+')) {
            return true;
        }
        
        // URL 패턴 (예: "https://m.blog.naver.com/...")
        if (line.startsWith('http') || line.includes('youtu.be') || line.includes('youtube.com')) {
            return true;
        }
        
        // YouTube 관련 텍스트
        if (line.includes('YouTube') || line.includes('유튜브')) {
            return true;
        }
        
        // 계좌 정보 패턴 (예: "* 카뱅 3333-16-1619747" 또는 "* 금란 카뱅 3333 16 1619747")
        if (line.includes('카뱅') || line.includes('계좌') || /\d{4}[\s-]?\d{2}[\s-]?\d{7}/.test(line)) {
            return true;
        }
        
        // 탑승지 정보 패턴 (예: "* 탑승(사당, 양재, 복정)" 또는 "* 8만원 / 사당>양재>죽전")
        if (line.includes('탑승(') || line.includes('탑승지') || /\d+만원/.test(line)) {
            return true;
        }
        
        // 날짜 패턴 (예: "1/10,토)" - 슬래시와 요일이 포함된 경우)
        if (/^\d+\/\d+[,\s]*[월화수목금토일]?\)/.test(line)) {
            return true;
        }
        
        // 숫자로 시작하지 않는 줄 (승객 정보는 반드시 "숫자."로 시작)
        if (!/^\d+\./.test(line)) {
            return true;
        }
        
        // 숫자. 으로 시작하지만 괄호가 없는 경우 (이름만 있거나 잘못된 형식)
        // 단, 이름만 있는 경우는 허용하므로 여기서는 체크하지 않음
        
        return false;
    }

    normalizePaymentStatus(status) {
        // 입금완료 관련 키워드들
        const paidKeywords = ['입완', '입금완료', '완료', '입금됨', '결제완료'];
        // 입금예정 관련 키워드들
        const pendingKeywords = ['예정', '입금예정', '미입금', '대기', '예약'];

        const statusLower = status.toLowerCase();
        
        if (paidKeywords.some(keyword => status.includes(keyword))) {
            return 'paid';
        } else if (pendingKeywords.some(keyword => status.includes(keyword))) {
            return 'pending';
        }
        
        // 기본값은 pending
        return 'pending';
    }

    isPaymentStatusKeyword(text) {
        // 입금 상태 관련 키워드인지 확인
        const allKeywords = ['입완', '입금완료', '완료', '입금됨', '결제완료', '예정', '입금예정', '미입금', '대기', '예약'];
        return allKeywords.some(keyword => text.includes(keyword));
    }

    validateSeatNumber(seatNumber) {
        // null 값은 허용 (미지정 탑승자)
        if (seatNumber === null) {
            return true;
        }
        return seatNumber >= 1 && seatNumber <= 28;
    }

    parseAndDisplay() {
        const textInput = document.getElementById('textInput');
        const inputText = textInput.value.trim();

        if (!inputText) {
            alert('승객 정보를 입력해주세요.');
            return;
        }

        try {
            // 기존 데이터 초기화
            this.clearSeats();

            // 텍스트 파싱
            this.passengers = this.parsePassengerText(inputText);

            if (this.passengers.length === 0) {
                alert('올바른 형식의 승객 정보를 찾을 수 없습니다.\n\n예시 형식 (순서 무관):\n1. 김진욱(입완, 양재, 1)\n2. 나정선(사당, 예정, 3)\n3. 박민수(5, 죽전, 입완)\n4. 이영희(신갈, 미정, 예정) ← 좌석 미지정\n5. 최철수(복정, 입완, 맘대로) ← 좌석 미지정\n6. 정민수(양재, 입완) ← 좌석번호 생략\n\n탑승지: 사당, 양재, 죽전, 신갈, 복정\n좌석 미지정: 미정, 아무곳이나, 아무대나, 맘대로, 임의배정, ^^, ? 등\n→ 미지정 시 뒷좌석부터 자동 임시 배정됩니다.');
                return;
            }

            // 좌석 번호 유효성 검사
            const invalidSeats = this.passengers.filter(p => !this.validateSeatNumber(p.seatNumber));
            if (invalidSeats.length > 0) {
                alert(`잘못된 좌석 번호가 있습니다: ${invalidSeats.map(p => p.seatNumber).join(', ')}\n좌석 번호는 1-28 사이여야 합니다.`);
                return;
            }

            // 중복 좌석 검사 (null 값 제외)
            const seatNumbers = this.passengers.map(p => p.seatNumber).filter(seat => seat !== null);
            const duplicateSeats = seatNumbers.filter((seat, index) => seatNumbers.indexOf(seat) !== index);
            if (duplicateSeats.length > 0) {
                alert(`중복된 좌석 번호가 있습니다: ${[...new Set(duplicateSeats)].join(', ')}`);
                return;
            }

            // 미지정 좌석 자동 배정 (뒷좌석부터)
            this.autoAssignUnspecifiedSeats();

            // 탑승지별 색상 할당
            this.assignLocationColors();
            
            // 좌석 배치도 업데이트
            this.displaySeats();
            this.displayLocationStats();
            this.displayPassengerList();

            // 성공 메시지
            const tempCount = this.passengers.filter(p => p.isTemporaryAssignment).length;
            if (tempCount > 0) {
                console.log(`${this.passengers.length}명의 승객 정보를 처리했습니다. (임시 배정: ${tempCount}명)`);
            } else {
                console.log(`${this.passengers.length}명의 승객 정보를 처리했습니다.`);
            }

        } catch (error) {
            console.error('파싱 오류:', error);
            alert('텍스트 처리 중 오류가 발생했습니다. 입력 형식을 확인해주세요.');
        }
    }

    autoAssignUnspecifiedSeats() {
        // 미지정 승객 찾기
        const unassignedPassengers = this.passengers.filter(p => p.seatNumber === null);
        
        if (unassignedPassengers.length === 0) {
            return; // 미지정 승객이 없으면 종료
        }

        // 이미 배정된 좌석 번호 목록
        const occupiedSeats = new Set(
            this.passengers
                .filter(p => p.seatNumber !== null)
                .map(p => p.seatNumber)
        );

        // 28번부터 1번까지 역순으로 빈 좌석 찾기 (뒷좌석부터)
        const availableSeats = [];
        for (let seat = 28; seat >= 1; seat--) {
            if (!occupiedSeats.has(seat)) {
                availableSeats.push(seat);
            }
        }

        // 미지정 승객에게 뒷좌석부터 임시 배정
        unassignedPassengers.forEach((passenger, index) => {
            if (index < availableSeats.length) {
                passenger.seatNumber = availableSeats[index];
                passenger.isTemporaryAssignment = true; // 임시 배정 표시
            }
        });

        console.log(`${unassignedPassengers.length}명의 승객을 뒷좌석부터 임시 배정했습니다.`);
    }

    assignLocationColors() {
        // 고유한 탑승지 목록 추출
        const uniqueLocations = [...new Set(this.passengers.map(p => p.location))];
        
        // 각 탑승지에 색상 할당
        uniqueLocations.forEach((location, index) => {
            if (!this.locationColors[location]) {
                this.locationColors[location] = this.colorPalette[index % this.colorPalette.length];
            }
        });
    }

    displaySeats() {
        // 모든 좌석 요소 가져오기
        const seatElements = document.querySelectorAll('.seat[data-seat]');

        this.passengers.forEach(passenger => {
            // 좌석번호가 있는 경우에만 좌석 표시
            if (passenger.seatNumber !== null) {
                const seatElement = document.querySelector(`[data-seat="${passenger.seatNumber}"]`);
                if (seatElement) {
                    // 좌석 상태 클래스 추가
                    seatElement.classList.add('occupied');
                    seatElement.classList.add(passenger.paymentStatus);
                    
                    // 임시 배정 표시
                    if (passenger.isTemporaryAssignment) {
                        seatElement.classList.add('temporary-assignment');
                    }
                    
                    // 탑승지별 색상 적용
                    const locationColor = this.locationColors[passenger.location];
                    if (locationColor) {
                        seatElement.style.backgroundColor = locationColor;
                        seatElement.style.borderColor = this.darkenColor(locationColor, 20);
                        
                        // 임시 배정의 경우 점선 테두리와 패턴 추가
                        if (passenger.isTemporaryAssignment) {
                            seatElement.style.borderStyle = 'dashed';
                            seatElement.style.borderWidth = '3px';
                            seatElement.style.opacity = '0.85';
                        } else {
                            // 입금 상태에 따른 투명도 조정
                            if (passenger.paymentStatus === 'pending') {
                                seatElement.style.opacity = '0.7';
                            } else {
                                seatElement.style.opacity = '1';
                            }
                        }
                    }
                    
                    // 승객 이름을 data 속성으로 추가 (CSS에서 표시용)
                    seatElement.setAttribute('data-passenger-name', passenger.name);
                    
                    // 툴팁 추가
                    const statusText = passenger.paymentStatus === 'paid' ? '입금완료' : '입금예정';
                    const assignmentText = passenger.isTemporaryAssignment ? '\n[임시 배정]' : '';
                    seatElement.title = `${passenger.name}\n${statusText}\n${passenger.location}${assignmentText}`;
                }
            }
        });
    }

    darkenColor(color, percent) {
        // 색상을 어둡게 만드는 유틸리티 함수
        const num = parseInt(color.replace("#",""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 + 
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 + 
            (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }

    displayLocationStats() {
        const locationStats = document.getElementById('locationStats');
        
        if (this.passengers.length === 0) {
            locationStats.innerHTML = '<p style="color: #7f8c8d; text-align: center;">통계 정보가 없습니다.</p>';
            return;
        }

        // 탑승지별 통계 계산
        const locationData = {};
        this.passengers.forEach(passenger => {
            const location = passenger.location;
            if (!locationData[location]) {
                locationData[location] = {
                    total: 0,
                    paid: 0,
                    pending: 0
                };
            }
            locationData[location].total++;
            if (passenger.paymentStatus === 'paid') {
                locationData[location].paid++;
            } else {
                locationData[location].pending++;
            }
        });

        // 탑승지별 통계 HTML 생성
        const locationStatsHTML = Object.entries(locationData)
            .sort((a, b) => b[1].total - a[1].total) // 인원수 많은 순으로 정렬
            .map(([location, stats]) => {
                const locationColor = this.locationColors[location] || '#3498db';
                return `
                    <div class="location-stat-item" style="border-left-color: ${locationColor};">
                        <div class="location-color-indicator" style="background-color: ${locationColor};"></div>
                        <div class="location-info">
                            <div class="location-name">${location}</div>
                            <div class="location-summary">총 ${stats.total}명</div>
                            <div class="location-details">
                                <span class="paid-count">✓ 입금완료 ${stats.paid}명</span>
                                <span class="pending-count">⏳ 입금예정 ${stats.pending}명</span>
                            </div>
                        </div>
                        <div class="location-count" style="background-color: ${locationColor};">${stats.total}</div>
                    </div>
                `;
            }).join('');

        // 전체 통계
        const totalStats = this.getStatistics();
        const totalStatsHTML = `
            <div class="total-stats">
                <div class="stats-group">
                    <div class="stats-group-header">
                        <h4>총 승객</h4>
                        <div class="total-count">${totalStats.total}명</div>
                    </div>
                    <div class="stats-group-details">
                        <div class="stat-item paid">
                            <div class="stat-icon">✓</div>
                            <div class="stat-info">
                                <div class="stat-number">${totalStats.paid}</div>
                                <div class="stat-label">입금완료</div>
                            </div>
                        </div>
                        <div class="stat-item pending">
                            <div class="stat-icon">⏳</div>
                            <div class="stat-info">
                                <div class="stat-number">${totalStats.pending}</div>
                                <div class="stat-label">입금예정</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="stats-group">
                    <div class="stats-group-header">
                        <h4>좌석 현황</h4>
                        <div class="total-count">28석</div>
                    </div>
                    <div class="stats-group-details">
                        <div class="stat-item occupied">
                            <div class="stat-icon">✓</div>
                            <div class="stat-info">
                                <div class="stat-number">${totalStats.confirmed}</div>
                                <div class="stat-label">확정배정</div>
                            </div>
                        </div>
                        ${totalStats.temporary > 0 ? `
                        <div class="stat-item temporary">
                            <div class="stat-icon">⚡</div>
                            <div class="stat-info">
                                <div class="stat-number">${totalStats.temporary}</div>
                                <div class="stat-label">임시배정</div>
                            </div>
                        </div>
                        ` : ''}
                        ${totalStats.unassigned > 0 ? `
                        <div class="stat-item unassigned">
                            <div class="stat-icon">❓</div>
                            <div class="stat-info">
                                <div class="stat-number">${totalStats.unassigned}</div>
                                <div class="stat-label">미배정</div>
                            </div>
                        </div>
                        ` : ''}
                        <div class="stat-item empty">
                            <div class="stat-icon">🪑</div>
                            <div class="stat-info">
                                <div class="stat-number">${totalStats.empty}</div>
                                <div class="stat-label">빈 좌석</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // 색상 범례 생성
        const colorLegendHTML = Object.entries(this.locationColors)
            .map(([location, color]) => {
                return `
                    <div class="color-legend-item">
                        <div class="color-dot" style="background-color: ${color};"></div>
                        <span>${location}</span>
                    </div>
                `;
            }).join('');

        locationStats.innerHTML = `
            <div class="location-stats">
                ${locationStatsHTML}
            </div>
            ${totalStatsHTML}
            ${colorLegendHTML ? `<div class="color-legend"><h4>탑승지별 색상</h4><div class="color-legend-grid">${colorLegendHTML}</div></div>` : ''}
        `;
    }

    displayPassengerList() {
        const passengerInfo = document.getElementById('passengerInfo');
        
        if (this.passengers.length === 0) {
            passengerInfo.innerHTML = '<p style="color: #7f8c8d; text-align: center;">승객 정보가 없습니다.</p>';
            return;
        }

        // 탑승지별로 그룹화
        const groupedPassengers = this.groupPassengersByLocation();
        
        // 그룹별 HTML 생성
        const groupedHTML = Object.entries(groupedPassengers)
            .sort((a, b) => b[1].length - a[1].length) // 인원수 많은 순으로 정렬
            .map(([location, passengers]) => {
                const locationColor = this.locationColors[location] || '#3498db';
                const locationStats = this.getLocationStats(passengers);
                
                return `
                    <div class="location-group">
                        <div class="location-group-header" style="border-left-color: ${locationColor};">
                            <div class="location-group-title">
                                <div class="location-color-indicator" style="background-color: ${locationColor};"></div>
                                <span class="location-name">${location}</span>
                                <span class="location-count">${passengers.length}명</span>
                            </div>
                            <div class="location-group-stats">
                                <span class="paid-count">✓ ${locationStats.paid}명</span>
                                <span class="pending-count">⏳ ${locationStats.pending}명</span>
                            </div>
                        </div>
                        <div class="passenger-group">
                            ${this.generatePassengerGroupHTML(passengers)}
                        </div>
                    </div>
                `;
            }).join('');

        passengerInfo.innerHTML = groupedHTML;
    }

    // 탑승지별로 승객 그룹화
    groupPassengersByLocation() {
        const groups = {};
        
        this.passengers.forEach(passenger => {
            const location = passenger.location;
            if (!groups[location]) {
                groups[location] = [];
            }
            groups[location].push(passenger);
        });
        
        // 각 그룹 내에서 좌석 번호 순으로 정렬
        Object.keys(groups).forEach(location => {
            groups[location].sort((a, b) => {
                if (a.seatNumber === null && b.seatNumber === null) return 0;
                if (a.seatNumber === null) return 1;
                if (b.seatNumber === null) return -1;
                return a.seatNumber - b.seatNumber;
            });
        });
        
        return groups;
    }

    // 그룹 내 승객 통계 계산
    getLocationStats(passengers) {
        const paid = passengers.filter(p => p.paymentStatus === 'paid').length;
        const pending = passengers.filter(p => p.paymentStatus === 'pending').length;
        return { paid, pending };
    }

    // 승객 그룹 HTML 생성
    generatePassengerGroupHTML(passengers) {
        return passengers.map(passenger => {
            const statusText = passenger.paymentStatus === 'paid' ? '입금완료' : '입금예정';
            const statusClass = passenger.paymentStatus;
            const isTemporary = passenger.isTemporaryAssignment;
            const seatText = passenger.seatNumber !== null 
                ? `${passenger.seatNumber}번${isTemporary ? ' (임시)' : ''}` 
                : '좌석 미지정';
            const isUnspecified = passenger.seatNumber === null;
            
            let itemClass = statusClass;
            if (isUnspecified) {
                itemClass += ' unspecified';
            } else if (isTemporary) {
                itemClass += ' temporary-assignment';
            }

            return `
                <div class="passenger-item ${itemClass}">
                    <div class="passenger-info">
                        <span class="passenger-name">${passenger.name}</span>
                        <span class="passenger-status ${statusClass}">${statusText}</span>
                        ${isTemporary ? '<span class="temporary-badge">임시배정</span>' : ''}
                    </div>
                    <div class="seat-number ${isUnspecified ? 'unspecified-seat' : ''} ${isTemporary ? 'temporary-seat' : ''}">${seatText}</div>
                </div>
            `;
        }).join('');
    }

    clearSeats() {
        const seatElements = document.querySelectorAll('.seat[data-seat]');
        seatElements.forEach(seat => {
            seat.classList.remove('occupied', 'paid', 'pending', 'temporary-assignment');
            seat.removeAttribute('data-passenger-name');
            seat.removeAttribute('title');
            // 인라인 스타일 초기화
            seat.style.backgroundColor = '';
            seat.style.borderColor = '';
            seat.style.borderStyle = '';
            seat.style.borderWidth = '';
            seat.style.opacity = '';
        });
    }

    clearAll() {
        // 입력창 초기화
        document.getElementById('textInput').value = '';
        
        // 승객 데이터 및 색상 초기화
        this.passengers = [];
        this.locationColors = {};
        
        // 좌석 상태 초기화
        this.clearSeats();
        
        // 통계 및 승객 목록 초기화
        this.displayLocationStats();
        this.displayPassengerList();
        
        console.log('모든 데이터가 초기화되었습니다.');
    }

    // 통계 정보 제공
    getStatistics() {
        const totalPassengers = this.passengers.length;
        const paidPassengers = this.passengers.filter(p => p.paymentStatus === 'paid').length;
        const pendingPassengers = this.passengers.filter(p => p.paymentStatus === 'pending').length;
        // 좌석이 배정된 승객 수 계산
        const assignedSeats = this.passengers.filter(p => p.seatNumber !== null).length;
        const temporaryAssignments = this.passengers.filter(p => p.isTemporaryAssignment).length;
        const confirmedSeats = assignedSeats - temporaryAssignments;
        const unassignedPassengers = this.passengers.filter(p => p.seatNumber === null).length;
        const emptySeats = 28 - assignedSeats;

        return {
            total: totalPassengers,
            paid: paidPassengers,
            pending: pendingPassengers,
            empty: emptySeats,
            unassigned: unassignedPassengers,
            temporary: temporaryAssignments,
            confirmed: confirmedSeats
        };
    }

    // 디버깅용 메서드
    debugInfo() {
        console.log('현재 승객 정보:', this.passengers);
        console.log('통계:', this.getStatistics());
    }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    window.busSeatManager = new BusSeatManager();
    
    // 예시 데이터 (개발용) - 다양한 입력 형식 지원
    const exampleData = `1. 김진욱(입완, 양재, 1)
2. 나정선(사당, 예정, 3)
3. 박민수(5, 죽전, 입완)
4. 이영희(신갈, 미정, 예정)
5. 최철수(복정, 입완, 맘대로)
6. 정민수(양재, 입완)
7. 강수진(죽전, 예정, 임의배정)
8. 홍길동(사당, 입완, 아무대나)`;
    
    // 개발 모드에서 예시 데이터 자동 입력 (주석 해제하여 사용)
    // document.getElementById('textInput').value = exampleData;
    
    console.log('1994 등반대 버스 좌석 배치 시스템이 준비되었습니다.');
    console.log('사용법: 텍스트를 입력하고 "좌석 배치 생성" 버튼을 클릭하세요.');
});
