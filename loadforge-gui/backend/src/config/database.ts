import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';

export interface DatabaseConfig {
  uri: string;
  dbName: string;
  gridFSBucketName: string;
}

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private gridFSBucket: GridFSBucket | null = null;

  private constructor() {}

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public async connect(config: DatabaseConfig): Promise<void> {
    try {
      await mongoose.connect(config.uri, {
        dbName: config.dbName,
      });

      console.log('Connected to MongoDB successfully');

      // Initialize GridFS bucket
      const db = mongoose.connection.db;
      if (db) {
        this.gridFSBucket = new GridFSBucket(db, {
          bucketName: config.gridFSBucketName,
        });
        console.log('GridFS bucket initialized');
      }
    } catch (error) {
      console.error('MongoDB connection error:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    await mongoose.disconnect();
    this.gridFSBucket = null;
    console.log('Disconnected from MongoDB');
  }

  public getGridFSBucket(): GridFSBucket {
    if (!this.gridFSBucket) {
      throw new Error('GridFS bucket not initialized. Call connect() first.');
    }
    return this.gridFSBucket;
  }

  public isConnected(): boolean {
    return mongoose.connection.readyState === 1;
  }
}

export const dbConnection = DatabaseConnection.getInstance(); 