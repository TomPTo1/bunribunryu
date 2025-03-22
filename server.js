const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const app = express();
const PORT = 3001;

// CORS 설정 및 JSON 파싱 미들웨어
app.use(cors());
app.use(express.json());

// 기본 루트 경로
app.get('/', (req, res) => {
  res.send('File API Server is running');
});

// 디렉토리 구조 가져오기
app.get('/api/files', (req, res) => {
  try {
    const requestedPath = req.query.path || 'src/browse_mode_sample_data';
    const absolutePath = path.resolve(requestedPath);
    
    // 보안 체크: 요청된 경로가 프로젝트 루트 내부인지 확인
    const rootDir = path.resolve('.');
    if (!absolutePath.startsWith(rootDir)) {
      return res.status(403).json({ error: '허용되지 않은 디렉토리 접근' });
    }
    
    // 디렉토리 존재 여부 확인
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ error: '디렉토리를 찾을 수 없습니다' });
    }
    
    // 디렉토리가 아닌 경우 에러 반환
    if (!fs.statSync(absolutePath).isDirectory()) {
      return res.status(400).json({ error: '요청한 경로는 디렉토리가 아닙니다' });
    }
    
    // 디렉토리 내용 읽기
    const items = fs.readdirSync(absolutePath);
    const directoryId = path.basename(absolutePath);
    
    // 폴더와 파일 정보 구성하기
    const result = {
      id: directoryId,
      name: path.basename(absolutePath),
      type: 'folder',
      path: requestedPath,
      children: items.map((item, index) => {
        const itemPath = path.join(absolutePath, item);
        const stats = fs.statSync(itemPath);
        const isDirectory = stats.isDirectory();
        
        return {
          id: `${directoryId}_${index}`,
          name: item,
          type: isDirectory ? 'folder' : 'file',
          path: path.join(requestedPath, item).replace(/\\/g, '/'),
          extension: isDirectory ? null : path.extname(item).substring(1)
        };
      })
    };
    
    res.json(result);
  } catch (error) {
    console.error('디렉토리 구조 가져오기 오류:', error);
    res.status(500).json({ error: '서버 오류', message: error.message });
  }
});

// 파일 내용 가져오기
app.get('/api/file-content', (req, res) => {
  try {
    const filePath = req.query.path;
    if (!filePath) {
      return res.status(400).json({ error: '파일 경로가 필요합니다' });
    }
    
    console.log('요청된 파일 경로:', filePath);
    const absolutePath = path.resolve(filePath);
    console.log('절대 경로:', absolutePath);
    
    // 보안 체크: 요청된 경로가 프로젝트 루트 내부인지 확인
    const rootDir = path.resolve('.');
    if (!absolutePath.startsWith(rootDir)) {
      return res.status(403).json({ error: '허용되지 않은 파일 접근' });
    }
    
    // 파일 존재 여부 확인
    if (!fs.existsSync(absolutePath)) {
      console.log('파일이 존재하지 않음:', absolutePath);
      return res.status(404).json({ error: '파일을 찾을 수 없습니다' });
    }
    
    // 파일이 아닌 경우 에러 반환
    if (!fs.statSync(absolutePath).isFile()) {
      return res.status(400).json({ error: '요청한 경로는 파일이 아닙니다' });
    }
    
    // 파일 확장자 확인
    const ext = path.extname(filePath).toLowerCase();
    console.log('파일 확장자:', ext);
    
    // XLSX 파일 처리
    if (ext === '.xlsx' || ext === '.xls') {
      try {
        console.log('XLSX 파일 처리 시작');
        const workbook = XLSX.readFile(absolutePath);
        const sheets = {};
        
        workbook.SheetNames.forEach(sheetName => {
          console.log('시트 처리 중:', sheetName);
          const sheet = workbook.Sheets[sheetName];
          const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          
          // 헤더와 데이터 행 분리
          const headers = data.length > 0 ? data[0] : [];
          const rows = data.slice(1);
          
          sheets[sheetName] = {
            headers,
            rows
          };
        });
        
        const result = {
          fileName: path.basename(filePath, ext),
          sheets
        };
        
        console.log('XLSX 파싱 완료, 시트 수:', Object.keys(sheets).length);
        res.json(result);
      } catch (xlsxError) {
        console.error('XLSX 파싱 오류:', xlsxError);
        return res.status(500).json({ 
          error: 'XLSX 파일 처리 오류', 
          message: xlsxError.message,
          stack: xlsxError.stack
        });
      }
    } else {
      // 일반 텍스트 파일 처리
      const content = fs.readFileSync(absolutePath, 'utf8');
      res.send(content);
    }
  } catch (error) {
    console.error('파일 내용 가져오기 오류:', error);
    res.status(500).json({ 
      error: '서버 오류', 
      message: error.message,
      stack: error.stack 
    });
  }
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다`);
}); 