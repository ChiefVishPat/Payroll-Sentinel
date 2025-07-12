"use client"

import { Tab } from "@headlessui/react"

/**
 * DataManagement provides a minimal interface for uploading or generating
 * company data. The actual upload and mock generation logic will be implemented
 * later.
 */
export default function DataManagement() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Data Management</h1>
        <p className="text-gray-600 dark:text-gray-300">Manage your payroll data or create sample records.</p>
      </div>

      <Tab.Group>
        <Tab.List className="flex space-x-4 border-b border-gray-200 dark:border-gray-700">
          <Tab
            className={({ selected }) =>
              `px-3 py-2 text-sm font-medium border-b-2 outline-none ${selected ?
                'border-indigo-500 text-indigo-600 dark:text-indigo-400' :
                'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`
            }
          >
            Upload Data
          </Tab>
          <Tab
            className={({ selected }) =>
              `px-3 py-2 text-sm font-medium border-b-2 outline-none ${selected ?
                'border-indigo-500 text-indigo-600 dark:text-indigo-400' :
                'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`
            }
          >
            Generate Mock Data
          </Tab>
        </Tab.List>
        <Tab.Panels className="mt-4">
          <Tab.Panel>
            <div className="p-4 border rounded-md text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-100">
              TODO: Upload Data
            </div>
          </Tab.Panel>
          <Tab.Panel>
            <div className="p-4 border rounded-md text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-100">
              TODO: Generate Mock Data
            </div>
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  )
}
