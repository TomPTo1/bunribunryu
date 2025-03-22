import { getFileContent } from './fileSystemService';

/**
 * XLSX 파일을 파싱하여 구조 데이터 추출
 * @param {string} filePath - 파싱할 XLSX 파일 경로
 * @returns {Promise<Object>} 시트, 헤더, 데이터를 포함한 파싱된 데이터 구조
 */
export const parseXLSXFile = async (filePath) => {
  console.log('파싱 시작:', filePath);
  
  try {
    // API 호출로 파일 내용 가져오기
    const xlsxData = await getFileContent(filePath);
    console.log('파싱 데이터 받음:', xlsxData ? '데이터 있음' : '데이터 없음');
    
    return xlsxData;
  } catch (error) {
    console.error('XLSX 파일 파싱 오류:', error);
    throw new Error(`XLSX 파싱 실패: ${error.message}`);
  }
}; 