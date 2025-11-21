/**
 * VEHICLE CARD COMPONENT
 * Display vehicle in card format
 */

import React from 'react';
import type { Vehicle } from '../types/vehicle.types';
import {
  formatVehicleName,
  formatPrice,
  formatMileageWithUnit,
  formatStatus,
  getStatusColor,
  getPrimaryPhotoUrl,
  formatDaysInInventory,
} from '../utils/formatters';

interface VehicleCardProps {
  vehicle: Vehicle;
  onClick?: (vehicle: Vehicle) => void;
  onEdit?: (vehicle: Vehicle) => void;
  onDelete?: (vehicle: Vehicle) => void;
  showActions?: boolean;
}

export function VehicleCard({
  vehicle,
  onClick,
  onEdit,
  onDelete,
  showActions = true,
}: VehicleCardProps) {
  const primaryPhoto = getPrimaryPhotoUrl(vehicle);
  const statusColor = getStatusColor(vehicle.status);

  return (
    <div
      className="vehicle-card"
      onClick={() => onClick?.(vehicle)}
      style={{
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 0.2s',
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Photo */}
      <div
        style={{
          height: '200px',
          backgroundColor: '#f7fafc',
          backgroundImage: primaryPhoto ? `url(${primaryPhoto})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {!primaryPhoto && (
          <span style={{ color: '#a0aec0', fontSize: '48px' }}>🚗</span>
        )}

        {/* Status badge */}
        <div
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            padding: '4px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: '600',
            backgroundColor:
              statusColor === 'green'
                ? '#48bb78'
                : statusColor === 'yellow'
                ? '#ecc94b'
                : statusColor === 'blue'
                ? '#4299e1'
                : statusColor === 'gray'
                ? '#a0aec0'
                : '#f56565',
            color: 'white',
          }}
        >
          {formatStatus(vehicle.status)}
        </div>

        {/* Stock number */}
        <div
          style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            padding: '4px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: '600',
            backgroundColor: 'rgba(0,0,0,0.7)',
            color: 'white',
          }}
        >
          {vehicle.stockNumber}
        </div>
      </div>

      {/* Details */}
      <div style={{ padding: '16px' }}>
        <h3
          style={{
            margin: '0 0 8px 0',
            fontSize: '18px',
            fontWeight: '600',
            color: '#2d3748',
          }}
        >
          {formatVehicleName(vehicle)}
        </h3>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#718096' }}>Price</div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: '#2d3748' }}>
              {formatPrice(vehicle.askingPrice)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#718096' }}>Mileage</div>
            <div style={{ fontSize: '16px', fontWeight: '500', color: '#2d3748' }}>
              {formatMileageWithUnit(vehicle.mileage)}
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            fontSize: '13px',
            color: '#718096',
            marginBottom: '12px',
          }}
        >
          <span>{vehicle.exteriorColor}</span>
          <span>•</span>
          <span>{vehicle.transmission}</span>
          <span>•</span>
          <span>{vehicle.drivetrain.toUpperCase()}</span>
        </div>

        <div style={{ fontSize: '12px', color: '#a0aec0' }}>
          {formatDaysInInventory(vehicle.createdAt)} in inventory
        </div>

        {/* Actions */}
        {showActions && (onEdit || onDelete) && (
          <div
            style={{
              marginTop: '12px',
              paddingTop: '12px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              gap: '8px',
            }}
          >
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(vehicle);
                }}
                style={{
                  padding: '6px 12px',
                  fontSize: '13px',
                  border: '1px solid #cbd5e0',
                  borderRadius: '4px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                }}
              >
                Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('Are you sure you want to delete this vehicle?')) {
                    onDelete(vehicle);
                  }
                }}
                style={{
                  padding: '6px 12px',
                  fontSize: '13px',
                  border: '1px solid #fc8181',
                  borderRadius: '4px',
                  backgroundColor: 'white',
                  color: '#e53e3e',
                  cursor: 'pointer',
                }}
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
