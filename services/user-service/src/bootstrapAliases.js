const fs = require('fs');
const path = require('path');
const moduleAlias = require('module-alias');

const dockerSharedPath = '/app/shared';
const localSharedPath = path.resolve(__dirname, '../../../shared');

moduleAlias.addAlias(
  '@shared',
  fs.existsSync(dockerSharedPath) ? dockerSharedPath : localSharedPath
);
