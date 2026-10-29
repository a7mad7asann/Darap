import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { StorageProvider } from './storage.provider';
import { LocalStorageProvider } from './local-storage.provider';

@Module({
  providers: [
    FilesService,
    {
      provide: StorageProvider,
      useClass: LocalStorageProvider,
    },
  ],
  exports: [FilesService, StorageProvider],
})
export class FilesModule {}
