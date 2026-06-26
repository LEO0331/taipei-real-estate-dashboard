import assert from 'node:assert/strict';
import test from 'node:test';
import { parseDistrictFromAddresses, parseFloorRecord, parseNumberWithUnit, parseParkingRecord, parseRocDate, parseRocYear } from './convertBuildingUsePermits.ts';
import { parsePublicUseStatus } from '../src/models.ts';

test('normalizes ROC permit fields and source units', () => {
  assert.deepEqual(parseRocYear('090'), { rocYear: 90, gregorianYear: 2001 });
  assert.equal(parseRocDate('1141231').isoDate, '2025-12-31');
  assert.equal(parseNumberWithUnit('1,234.5㎡'), 1234.5);
});
test('extracts permit context without confusing non-public status', () => {
  assert.equal(parseDistrictFromAddresses(['臺北市松山區南京東路']), '松山區');
  assert.equal(parsePublicUseStatus('RC造(非供公眾使用建築物)'), 'non_public_use');
  assert.equal(parseFloorRecord('地下1樓,面積:199.45㎡,高度:3.15M,用途:停車空間').useCategory, 'parking');
  assert.equal(parseParkingRecord('設置類別:平面,車位分類:汽車,檢討類別:法定,室外,地上,輛數:1,面積:15㎡').spaceCount, 1);
});
